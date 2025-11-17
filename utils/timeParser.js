/**
 * Détecte TOUTES les durées mentionnées dans un texte
 * @param {string} text - Texte de l'instruction
 * @returns {Array<{duration: number, label: string}>} - Tableau des durées trouvées
 */
export function detectAllDurations(text) {
    if (!text) return [];
    
    const lowerText = text.toLowerCase();
    const durations = [];
    const found = new Set(); // Pour éviter les doublons
    
    // Pattern 1: "X h Y min" ou "X heures Y minutes" (avec le mot min/minutes)
    const complexMatches = [...lowerText.matchAll(/(\d+)\s*(heures?|h)\s*(?:et\s*)?(\d+)\s*(minutes?|min)/g)];
    complexMatches.forEach(match => {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[3]);
        const totalMinutes = (hours * 60) + minutes;
        const key = `${totalMinutes}`;
        
        if (!found.has(key)) {
            found.add(key);
            durations.push({
                duration: totalMinutes,
                label: formatDuration(totalMinutes)
            });
        }
    });
    
    // Pattern 1b: "1h30" ou "2h45" (sans le mot min/minutes) ← NOUVEAU
    const compactMatches = [...lowerText.matchAll(/(\d+)h(\d+)(?!\s*(?:minutes?|min))/g)];
    compactMatches.forEach(match => {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const totalMinutes = (hours * 60) + minutes;
        const key = `${totalMinutes}`;
        
        if (!found.has(key)) {
            found.add(key);
            durations.push({
                duration: totalMinutes,
                label: formatDuration(totalMinutes)
            });
        }
    });
    
    // Pattern 2: "X heures" ou "X h" (sans minutes)
    const hoursMatches = [...lowerText.matchAll(/(\d+)\s*(heures?|h)(?:\s|$|,|\.|\)|;)/g)];
    hoursMatches.forEach(match => {
        const minutes = parseInt(match[1]) * 60;
        const key = `${minutes}`;
        
        if (!found.has(key)) {
            found.add(key);
            durations.push({
                duration: minutes,
                label: formatDuration(minutes)
            });
        }
    });
    
    // Pattern 3: "X minutes" ou "X min"
    const minutesMatches = [...lowerText.matchAll(/(\d+)\s*(minutes?|min)(?:\s|$|,|\.|\)|;)/g)];
    minutesMatches.forEach(match => {
        const minutes = parseInt(match[1]);
        const key = `${minutes}`;
        
        if (!found.has(key)) {
            found.add(key);
            durations.push({
                duration: minutes,
                label: formatDuration(minutes)
            });
        }
    });
    
    // Pattern 4: Demi-heure
    if (lowerText.match(/demi[- ]?heure/)) {
        const key = '30';
        if (!found.has(key)) {
            found.add(key);
            durations.push({ duration: 30, label: '30 min' });
        }
    }
    
    // Pattern 5: Quart d'heure
    if (lowerText.match(/quart d'heure/)) {
        const key = '15';
        if (!found.has(key)) {
            found.add(key);
            durations.push({ duration: 15, label: '15 min' });
        }
    }
    
    // Pattern 6: Trois quarts d'heure
    if (lowerText.match(/trois quarts d'heure/)) {
        const key = '45';
        if (!found.has(key)) {
            found.add(key);
            durations.push({ duration: 45, label: '45 min' });
        }
    }
    
    return durations;
}

/**
 * Formate une durée en minutes en texte lisible
 * @param {number} minutes - Durée en minutes
 * @returns {string} - Texte formaté (ex: "1h 30min" ou "45 min")
 */
export function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) {
        return `${hours}h`;
    }
    
    return `${hours}h ${mins}min`;
}

/**
 * Formate un temps restant en MM:SS
 * @param {number} seconds - Secondes restantes
 * @returns {string} - Temps formaté (ex: "05:32")
 */
export function formatRemainingTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}