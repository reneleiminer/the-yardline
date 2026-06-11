import React from 'react';

export default function MentionText({ text, mentions = [] }) {
  if (!text) return null;
  if (!mentions || mentions.length === 0) return <>{text}</>;
  
  // Sort mentions by position to avoid replacement conflicts
  const sortedMentions = [...mentions].sort((a, b) => {
    const posA = text.indexOf(`@${a.username}`);
    const posB = text.indexOf(`@${b.username}`);
    return posA - posB;
  });
  
  let lastIndex = 0;
  const parts = [];
  
  sortedMentions.forEach((mention, idx) => {
    const mentionText = `@${mention.username}`;
    const index = text.indexOf(mentionText, lastIndex);
    
    if (index !== -1) {
      // Add text before mention
      if (index > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {text.substring(lastIndex, index)}
          </span>
        );
      }
      
      // Keep mentions readable without exposing public user profiles.
       parts.push(
         <span
           key={`mention-${idx}`}
           className="font-medium text-primary"
         >
           {mentionText}
         </span>
       );
      
      lastIndex = index + mentionText.length;
    }
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end">
        {text.substring(lastIndex)}
      </span>
    );
  }
  
  return <>{parts}</>;
}
