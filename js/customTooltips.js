/*
 * Copyright (C) 2026 Stumper_Gaming
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Custom Tooltip System - Dynamic Content from Wowhead/Ascension
(function () {
    'use strict';

    let currentTooltip = null;
    let hideTimeout = null;
    let tooltipCache = {}; // Cache pour éviter les requêtes répétées

    // Create tooltip element
    function createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'wowhead-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    // Fetch spell data from Wowhead/Ascension API
    async function fetchSpellData(spellId) {
        // Check cache first
        if (tooltipCache[spellId]) {
            return tooltipCache[spellId];
        }

        try {
            // Utilise l'API Wowhead pour récupérer les données du sort
            const response = await fetch(`https://wowhead.com/tooltip/spell/${spellId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch spell data');
            }

            const html = await response.text();

            // Cache the result
            tooltipCache[spellId] = html;
            return html;
        } catch (error) {
            console.warn(`Failed to fetch tooltip for spell ${spellId}:`, error);
            return null;
        }
    }

    // Generate loading tooltip
    function generateLoadingHTML() {
        return `
            <div class="tooltip-box">
                <div class="tt-body" style="text-align: center; padding: 10px;">
                    Loading...
                </div>
            </div>
        `;
    }

    // Position tooltip near cursor
    function positionTooltip(tooltip, event) {
        const offset = 10;

        // For fixed positioning, use clientX/Y directly (no scroll offset needed)
        let left = event.clientX + offset;
        let top = event.clientY + offset;

        // Only adjust if it would go off the right edge
        const tooltipRect = tooltip.getBoundingClientRect();
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        // Adjust if it would go off the bottom
        if (top + tooltipRect.height > window.innerHeight) {
            top = window.innerHeight - tooltipRect.height - 10;
        }

        // For fixed position, don't add scroll offset
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    // Show tooltip
    async function showTooltip(link, event) {
        clearTimeout(hideTimeout);

        const spellId = link.getAttribute('data-ascension-spell');

        if (!spellId) {
            console.warn('No spell ID found on link');
            return;
        }

        if (!currentTooltip) {
            currentTooltip = createTooltip();
        }

        // Show loading state immediately
        currentTooltip.innerHTML = generateLoadingHTML();
        currentTooltip.style.cssText = `
            display: block;
            position: fixed;
            z-index: 9999;
            pointer-events: none;
            max-width: 420px;
        `;

        positionTooltip(currentTooltip, event);

        // Fetch and display actual content
        const tooltipHTML = await fetchSpellData(spellId);

        if (tooltipHTML && currentTooltip) {
            // Wrap the Wowhead HTML in our custom styling
            currentTooltip.innerHTML = `<div class="tooltip-box">${tooltipHTML}</div>`;
            positionTooltip(currentTooltip, event);
        }
    }

    // Hide tooltip
    function hideTooltip() {
        hideTimeout = setTimeout(() => {
            if (currentTooltip) {
                currentTooltip.style.display = 'none';
            }
        }, 100);
    }

    // Initialize tooltips
    function initTooltips() {
        document.querySelectorAll('a[data-ascension-spell]').forEach(link => {
            // Remove old listeners to avoid duplicates
            link.removeEventListener('mouseenter', link._tooltipEnter);
            link.removeEventListener('mousemove', link._tooltipMove);
            link.removeEventListener('mouseleave', link._tooltipLeave);

            // Create new listeners
            link._tooltipEnter = (e) => showTooltip(link, e);
            link._tooltipMove = (e) => {
                if (currentTooltip && currentTooltip.style.display === 'block') {
                    positionTooltip(currentTooltip, e);
                }
            };
            link._tooltipLeave = hideTooltip;

            // Attach listeners
            link.addEventListener('mouseenter', link._tooltipEnter);
            link.addEventListener('mousemove', link._tooltipMove);
            link.addEventListener('mouseleave', link._tooltipLeave);
        });
    }

    // Initialize when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTooltips);
    } else {
        initTooltips();
    }

    // Re-initialize when table updates
    const observer = new MutationObserver(() => {
        initTooltips();
    });

    const tableBody = document.getElementById('reBody');
    if (tableBody) {
        observer.observe(tableBody, {
            childList: true,
            subtree: true
        });
    }
})();
