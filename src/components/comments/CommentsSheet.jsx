import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import CommentsList from '@/components/comments/CommentsList';
import CommentInput from '@/components/comments/CommentInput';

export default function CommentsSheet({ postId, isOpen, onOpenChange, onCountChange }) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] max-h-[90vh] flex flex-col rounded-t-2xl px-3 sm:px-4">
        <SheetHeader className="py-3">
          <h2 className="text-base sm:text-lg font-bold">Kommentare</h2>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-1 sm:px-2">
          <CommentsList postId={postId} isOpen={isOpen} onCountChange={onCountChange} />
        </div>

        <div className="pb-4 px-1 sm:px-2">
          <CommentInput postId={postId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}