import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, RotateCcw, Trash2, AlertTriangle, Lock, Unlock } from 'lucide-react';

export default function UserMoreMenu({
  user,
  onReset,
  onWarn,
  onSuspend,
  onUnsuspend,
  isPending,
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onWarn(user)} disabled={isPending}>
          <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
          Verwarnen
        </DropdownMenuItem>

        {user.status !== 'suspended' ? (
          <DropdownMenuItem onClick={() => onSuspend(user)} disabled={isPending}>
            <Lock className="w-4 h-4 mr-2 text-destructive" />
            Sperren
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onUnsuspend(user)} disabled={isPending}>
            <Unlock className="w-4 h-4 mr-2 text-green-600" />
            Entsperren
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onReset(user)} disabled={isPending}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Auf Fan zurücksetzen
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => {}} disabled className="text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}