// utils/catalog.js
import { spawnBackend } from "./backend";

export let availableCommands = [];
export let availableAliases = [];

/**
 * Load sudo command catalog from backend.
 * Returns the full catalog for use in the UI
 */
export async function loadCommandCatalog() {
  availableCommands = [];
  availableAliases = [];
  
  const out = await spawnBackend(["catalog"]);
  const catalog = JSON.parse(out);
  
  // Build flat lists
  Object.values(catalog).forEach(section => {
    // Collect command aliases
    Object.keys(section.command_aliases || {}).forEach(alias => {
      if (!availableCommands.includes(alias)) {
        availableCommands.push(alias);
      }
      if (!availableAliases.includes(alias)) {
        availableAliases.push(alias);
      }
    });
    
    // Collect raw commands
    (section.raw_commands || []).forEach(cmd => {
      if (!availableCommands.includes(cmd)) {
        availableCommands.push(cmd);
      }
    });
  });
  
  return catalog;
}

/**
 * Get commands grouped by category file for select options
 * Returns array of {category, options} where each option is a command/alias
 */
export function getCategorizedCommands(catalog) {
  const grouped = [];
  
  // Sort by category name (00-aliases, 10-defaults, etc.)
  const sortedCategories = Object.keys(catalog).sort();
  
  sortedCategories.forEach(category => {
    const section = catalog[category];
    const options = [];
    
    // Add command aliases from this category
    Object.entries(section.command_aliases || {}).forEach(([alias, commands]) => {
      options.push({
        value: alias,
        label: alias,
        isAlias: true,
        commands: commands, // For tooltip/display
      });
    });
    
    // Add raw commands from this category
    (section.raw_commands || []).forEach(cmd => {
      options.push({
        value: cmd,
        label: cmd,
        isAlias: false,
      });
    });
    
    if (options.length > 0) {
      grouped.push({ category, options });
    }
  });
  
  return grouped;
}
