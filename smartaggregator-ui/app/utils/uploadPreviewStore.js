const fs = require('fs');
const path = require('path');

const PREVIEW_DIR = path.resolve(__dirname, '../../uploads/.preview-cache');

function normalizeUserId(userId) {
    if (!userId) return null;
    return String(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getPreviewPath(userId) {
    const normalized = normalizeUserId(userId);
    if (!normalized) return null;
    return path.join(PREVIEW_DIR, `${normalized}.json`);
}

async function ensurePreviewDir() {
    await fs.promises.mkdir(PREVIEW_DIR, {recursive: true});
}

async function saveUploadPreviewJobs(userId, jobs) {
    const filePath = getPreviewPath(userId);
    if (!filePath) return;

    const list = Array.isArray(jobs) ? jobs : [];
    const payload = {
        updatedAt: new Date().toISOString(),
        jobs: list
    };

    await ensurePreviewDir();
    await fs.promises.writeFile(filePath, JSON.stringify(payload), 'utf8');
}

async function loadUploadPreviewJobs(userId) {
    const filePath = getPreviewPath(userId);
    if (!filePath) return [];

    try {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed && parsed.jobs) ? parsed.jobs : [];
    } catch (err) {
        return [];
    }
}

module.exports = {
    saveUploadPreviewJobs,
    loadUploadPreviewJobs
};