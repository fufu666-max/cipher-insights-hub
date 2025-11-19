import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CreateLotteryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, maxParticipants: number) => void;
}

export function CreateLotteryDialog({ open, onOpenChange, onCreate }: CreateLotteryDialogProps) {
  const [name, setName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);

  const handleSubmit = () => {
    if (name && maxParticipants > 0) {
      onCreate(name, maxParticipants);
      setName('');
      setMaxParticipants(10);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Lottery</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Lottery Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Max Participants"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            className="w-full p-2 border rounded"
          />
          <button onClick={handleSubmit} className="w-full p-2 bg-blue-500 text-white rounded">
            Create
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
