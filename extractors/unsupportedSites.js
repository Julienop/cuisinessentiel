// extractors/unsupportedSites.js
// Liste des sites qui ne peuvent pas être extraits automatiquement

/**
 * Sites avec protection anti-bot trop forte ou nécessitant JavaScript
 */
export const UNSUPPORTED_SITES = [
    {
        domain: 'atelierdeschefs.fr',
        reason: 'Protection anti-bot très forte (rendu JavaScript complet)',
        message: 'Ce site utilise une protection qui empêche l\'extraction automatique. Utilisez l\'ajout manuel ! 📝'
    },
    {
        domain: 'lacuisinedebernard.com',
        reason: 'Protection anti-bot très forte (rendu JavaScript complet)',
        message: 'Ce site utilise une protection qui empêche l\'extraction automatique. Utilisez l\'ajout manuel ! 📝'
    },
    {
        domain: 'carrefour.fr',
        reason: 'Protection anti-bot très forte (rendu JavaScript complet)',
        message: 'Ce site utilise une protection qui empêche l\'extraction automatique. Utilisez l\'ajout manuel ! 📝'
    }
];

/**
 * Vérifie si un domaine est dans la liste noire
 */
export function isUnsupportedSite(domain) {
    return UNSUPPORTED_SITES.find(site => domain.includes(site.domain));
}