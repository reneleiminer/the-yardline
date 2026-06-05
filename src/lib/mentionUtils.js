/**
 * Parse mentions from text
 * Returns array of { userId, username, displayName }
 */
export const parseMentions = (text) => {
  if (!text) return [];
  
  const mentionRegex = /@([a-z0-9._]+)/gi;
  const matches = [...text.matchAll(mentionRegex)];
  
  return matches.map(match => ({
    username: match[1].toLowerCase(),
    displayName: match[1]
  }));
};

/**
 * Format text with clickable mentions
 * Takes text and mentions array, returns JSX with links
 */
export const formatMentionsInText = (text, mentions = []) => {
  if (!text || !mentions.length) return text;
  
  let result = text;
  
  // Replace @username with clickable link
  mentions.forEach(mention => {
    const pattern = new RegExp(`@${mention.username}`, 'gi');
    result = result.replace(pattern, (match) => `[@${mention.username}](/@${mention.userId})`);
  });
  
  return result;
};

/**
 * Extract user IDs from mentions for notifications
 */
export const getMentionedUserIds = (mentions = []) => {
  return mentions.map(m => m.userId).filter(Boolean);
};