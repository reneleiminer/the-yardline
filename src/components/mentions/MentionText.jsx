import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function MentionText({ text, mentions = [] }) {
  const navigate = useNavigate();
  
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
      
      // Add mention as link
       parts.push(
         <button
           key={`mention-${idx}`}
           onClick={(e) => {
             e.stopPropagation();
             navigate(`/profile/${mention.userId}`);
           }}
           className="text-primary hover:underline font-medium"
         >
           {mentionText}
         </button>
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