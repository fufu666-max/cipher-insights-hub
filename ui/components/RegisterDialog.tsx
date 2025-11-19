import { useState } from 'react';

interface RegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister: (number: number) => void;
}

export function RegisterDialog({ open, onOpenChange, onRegister }: RegisterDialogProps) {
  const [number, setNumber] = useState(0);

  const handleSubmit = () => {
    if (number > 0) {
      onRegister(number);
      setNumber(0);
      onOpenChange(false);
    }
  };

  return (
    <div className={ixed inset-0 z-50 }>
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Register Participant</h2>
        <input
          type="number"
          placeholder="Your Number"
          value={number}
          onChange={(e) => setNumber(Number(e.target.value))}
          className="w-full p-2 border rounded mb-4"
        />
        <button onClick={handleSubmit} className="w-full p-2 bg-green-500 text-white rounded">
          Register
        </button>
      </div>
    </div>
  );
}
