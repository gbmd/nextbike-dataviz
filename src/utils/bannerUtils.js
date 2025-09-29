/**
 * Utility functions for resolving banner images with priority system
 * These work with Vite's static asset handling and provide fallback mechanisms
 */

/**
 * Gets the primary banner path to try for a given type
 * @param {string} projectId - The project identifier
 * @param {string} type - The banner type ('home' or 'carousel')
 * @returns {object} - Object with primary and fallback URLs
 */
export function getBannerUrls(projectId, type = 'home') {
    const priorityBanners = {
        home: 'banner_home.png',
        carousel: 'banner_carousel.png'
    };

    const priorityBanner = priorityBanners[type];
    const fallbackBanner = 'banner.png';

    return {
        primary: priorityBanner ?
            new URL(`../projects/${projectId}/${priorityBanner}`, import.meta.url).href :
            new URL(`../projects/${projectId}/${fallbackBanner}`, import.meta.url).href,
        fallback: new URL(`../projects/${projectId}/${fallbackBanner}`, import.meta.url).href
    };
}

/**
 * Creates a banner src that will attempt priority banner with img onerror fallback
 * @param {string} projectId - The project identifier
 * @param {string} type - The banner type ('home' or 'carousel')
 * @returns {string} - The primary banner URL to try first
 */
export function getPrimaryBannerUrl(projectId, type = 'home') {
    const urls = getBannerUrls(projectId, type);
    return urls.primary;
}

/**
 * Gets the fallback banner URL
 * @param {string} projectId - The project identifier
 * @returns {string} - The fallback banner URL
 */
export function getFallbackBannerUrl(projectId) {
    return new URL(`../projects/${projectId}/banner.png`, import.meta.url).href;
}
