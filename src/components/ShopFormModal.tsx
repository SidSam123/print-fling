
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ShopForm from '@/components/ShopForm';

interface ShopFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  shopId?: string;
}

const ShopFormModal: React.FC<ShopFormModalProps> = ({ 
  open, 
  onOpenChange, 
  onSuccess,
  shopId
}) => {
  const handleSuccess = () => {
    onOpenChange(false);
    if (onSuccess) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{shopId ? 'Edit Shop' : 'Register New Shop'}</DialogTitle>
        </DialogHeader>
        <ShopForm 
          shopId={shopId} 
          onSuccess={handleSuccess} 
          onCancel={() => onOpenChange(false)} 
        />
      </DialogContent>
    </Dialog>
  );
};

export default ShopFormModal;
