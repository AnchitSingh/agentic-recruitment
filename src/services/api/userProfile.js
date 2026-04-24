import { STORAGE_KEYS } from './constants';
import { createSuccessResponse } from './helpers';

export async function getUserProfile() {
    await this._loadData();

    let profileData = null;

    if (typeof chrome !== 'undefined' && chrome.storage) {
        profileData = await new Promise((resolve) => {
            chrome.storage.local.get([STORAGE_KEYS.USER_PROFILE], (result) => {
                resolve(result[STORAGE_KEYS.USER_PROFILE] || null);
            });
        });
    } else {
        const storedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        if (storedProfile) {
            profileData = JSON.parse(storedProfile);
        }
    }

    if (profileData) {
        return createSuccessResponse(profileData);
    }

    return createSuccessResponse({
        name: 'Study Enthusiast',
        email: 'exam.buddy@gmail.com',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
    });
}