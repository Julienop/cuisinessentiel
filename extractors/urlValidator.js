// extractors/urlValidator.js
// Validation et sécurisation des URLs pour éviter les attaques SSRF

/**
 * Valide qu'une URL est sûre à fetcher
 * Bloque les protocoles dangereux et les IPs privées
 * 
 * @param {string} url - URL à valider
 * @returns {boolean} - true si l'URL est sûre
 * @throws {Error} - Si l'URL est dangereuse
 */
export function validateUrl(url) {
    if (!url || typeof url !== 'string') {
        throw new Error('URL invalide');
    }

    let urlObj;
    try {
        urlObj = new URL(url);
    } catch (error) {
        throw new Error('Format d\'URL invalide');
    }

    // ✅ ÉTAPE 1 : Vérifier le protocole (seulement HTTP/HTTPS)
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
        throw new Error(`Protocole non autorisé: ${urlObj.protocol}. Seulement HTTP/HTTPS acceptés.`);
    }

    // ✅ ÉTAPE 2 : Bloquer les IPs privées et localhost
    const hostname = urlObj.hostname.toLowerCase();
    
    // Bloquer localhost
    if (isLocalhost(hostname)) {
        throw new Error('Accès localhost interdit');
    }

    // Bloquer les IPs privées
    if (isPrivateIP(hostname)) {
        throw new Error('Accès aux IPs privées interdit');
    }

    // ✅ ÉTAPE 3 : Bloquer les domaines suspects
    const suspiciousDomains = [
        'metadata.google.internal', // GCP metadata
        '169.254.169.254',           // AWS metadata
    ];

    if (suspiciousDomains.includes(hostname)) {
        throw new Error('Domaine interdit');
    }

    return true;
}

/**
 * Vérifie si un hostname est localhost
 */
function isLocalhost(hostname) {
    const localhostPatterns = [
        'localhost',
        '127.0.0.1',
        '::1',
        '0.0.0.0',
    ];

    return localhostPatterns.some(pattern => hostname === pattern);
}

/**
 * Vérifie si un hostname est une IP privée
 */
function isPrivateIP(hostname) {
    // Si ce n'est pas une IP, on laisse passer (c'est un domaine)
    if (!isIPAddress(hostname)) {
        return false;
    }

    // Patterns d'IPs privées (RFC 1918)
    const privateRanges = [
        /^10\./,                    // 10.0.0.0/8
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
        /^192\.168\./,              // 192.168.0.0/16
        /^127\./,                   // 127.0.0.0/8 (loopback)
        /^169\.254\./,              // 169.254.0.0/16 (link-local)
    ];

    return privateRanges.some(pattern => pattern.test(hostname));
}

/**
 * Vérifie si une string est une adresse IP
 */
function isIPAddress(hostname) {
    // IPv4
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 (simplifié)
    const ipv6Pattern = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
    
    return ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname);
}