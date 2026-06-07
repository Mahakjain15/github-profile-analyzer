const axios = require('axios');
const pool = require('../config/db');

const GITHUB_API_BASE = 'https://api.github.com';

function buildGitHubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'GitHub-Profile-Analyzer-API',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

function findTopLanguage(repos) {
  const languageCounts = {};

  for (const repo of repos) {
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  }

  const entries = Object.entries(languageCounts);
  if (entries.length === 0) {
    return null;
  }

  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function calculateProfileScore(user, repos, topLanguage) {
  let score = 0;

  score += Math.min(user.public_repos * 2, 40);
  score += Math.min(user.followers * 0.1, 30);
  score += Math.min(user.following * 0.05, 10);

  if (user.bio && user.bio.trim().length > 0) {
    score += 10;
  }

  if (user.name && user.name.trim().length > 0) {
    score += 5;
  }

  if (topLanguage) {
    score += 5;
  }

  const reposWithDescription = repos.filter(
    (repo) => repo.description && repo.description.trim().length > 0
  ).length;
  score += Math.min(reposWithDescription * 0.5, 10);

  return Math.round(Math.min(score, 100) * 100) / 100;
}

async function fetchGitHubUser(username) {
  const response = await axios.get(`${GITHUB_API_BASE}/users/${username}`, {
    headers: buildGitHubHeaders(),
    timeout: 10000,
  });
  return response.data;
}

async function fetchGitHubRepos(username) {
  const repos = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await axios.get(`${GITHUB_API_BASE}/users/${username}/repos`, {
      headers: buildGitHubHeaders(),
      params: {
        per_page: perPage,
        page,
        sort: 'updated',
        direction: 'desc',
      },
      timeout: 10000,
    });

    repos.push(...response.data);

    if (response.data.length < perPage) {
      break;
    }

    page += 1;

    if (page > 10) {
      break;
    }
  }

  return repos;
}

function mapRowToProfile(row) {
  return {
    username: row.username,
    name: row.name,
    bio: row.bio,
    public_repos: row.public_repos,
    followers: row.followers,
    following: row.following,
    top_language: row.top_language,
    profile_score: parseFloat(row.profile_score),
    analyzed_at: row.analyzed_at,
  };
}

const analyzeProfile = async (req, res) => {
  const { username } = req.params;

  if (!username || !/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid GitHub username format',
    });
  }

  try {
    const [user, repos] = await Promise.all([
      fetchGitHubUser(username),
      fetchGitHubRepos(username),
    ]);

    const topLanguage = findTopLanguage(repos);
    const profileScore = calculateProfileScore(user, repos, topLanguage);

    const profileData = {
      username: user.login,
      name: user.name || null,
      bio: user.bio || null,
      public_repos: user.public_repos,
      followers: user.followers,
      following: user.following,
      top_language: topLanguage,
      profile_score: profileScore,
    };

    const upsertQuery = `
      INSERT INTO github_profiles
        (username, name, bio, public_repos, followers, following, top_language, profile_score, analyzed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        bio = VALUES(bio),
        public_repos = VALUES(public_repos),
        followers = VALUES(followers),
        following = VALUES(following),
        top_language = VALUES(top_language),
        profile_score = VALUES(profile_score),
        analyzed_at = NOW()
    `;

    await pool.execute(upsertQuery, [
      profileData.username,
      profileData.name,
      profileData.bio,
      profileData.public_repos,
      profileData.followers,
      profileData.following,
      profileData.top_language,
      profileData.profile_score,
    ]);

    return res.status(200).json({
      success: true,
      message: 'Profile analyzed and saved successfully',
      data: {
        ...profileData,
        analyzed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error.response) {
      const status = error.response.status;

      if (status === 404) {
        return res.status(404).json({
          success: false,
          message: `GitHub user '${username}' not found`,
        });
      }

      if (status === 403) {
        return res.status(429).json({
          success: false,
          message: 'GitHub API rate limit exceeded. Try again later or set GITHUB_TOKEN in .env',
        });
      }
    }

    console.error('Error analyzing profile:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze GitHub profile',
    });
  }
};

const getAllProfiles = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT username, name, bio, public_repos, followers, following,
              top_language, profile_score, analyzed_at
       FROM github_profiles
       ORDER BY profile_score DESC, analyzed_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows.map(mapRowToProfile),
    });
  } catch (error) {
    console.error('Error fetching profiles:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profiles from database',
    });
  }
};

const getProfileByUsername = async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({
      success: false,
      message: 'Username is required',
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT username, name, bio, public_repos, followers, following,
              top_language, profile_score, analyzed_at
       FROM github_profiles
       WHERE username = ?`,
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Profile '${username}' not found in database. Analyze it first with POST /api/profiles/${username}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: mapRowToProfile(rows[0]),
    });
  } catch (error) {
    console.error('Error fetching profile:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile from database',
    });
  }
};

module.exports = {
  analyzeProfile,
  getAllProfiles,
  getProfileByUsername,
};
