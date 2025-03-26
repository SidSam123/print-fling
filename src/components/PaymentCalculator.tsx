import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PrintSpecs } from '@/components/PrintSpecifications';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, CreditCard, Loader2 } from 'lucide-react';

interface PaymentCalculatorProps {
  printSpecs: PrintSpecs;
  shopId: string | null;
  documentPath: string | null;
  onOrderPlaced: () => void;
}

const PaymentCalculator = ({ 
  printSpecs, 
  shopId, 
  documentPath,
  onOrderPlaced 
}: PaymentCalculatorProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const calculateTotalPrice = () => {
    if (!printSpecs.pricePerPage) return 0;
    
    // Base calculation
    let basePrice = printSpecs.pricePerPage * printSpecs.pageCount * printSpecs.copies;
    
    // Apply double-sided discount if enabled (15% off)
    if (printSpecs.doubleSided) {
      basePrice = basePrice * 0.85;
    }
    
    // Apply stapling fee if enabled (add $0.50)
    const staplingFee = printSpecs.stapling ? 0.5 : 0;
    
    // Return formatted to 2 decimal places
    return Math.round((basePrice + staplingFee) * 100) / 100;
  };

  const handlePlaceOrder = async () => {
    if (!user || !shopId || !documentPath) {
      toast.error('Missing required information to place order');
      return;
    }
    
    if (!printSpecs.pricePerPage) {
      toast.error('Cannot place order without pricing information');
      return;
    }
    
    setLoading(true);
    try {
      const totalPrice = calculateTotalPrice();
      
      // Insert the print job into the database
      const { data, error } = await supabase
        .from('print_jobs')
        .insert({
          customer_id: user.id,
          shop_id: shopId,
          file_path: documentPath,
          paper_size: printSpecs.paperSize,
          color_mode: printSpecs.colorMode,
          copies: printSpecs.copies,
          double_sided: printSpecs.doubleSided,
          stapling: printSpecs.stapling,
          price: totalPrice,
          status: 'pending'
        })
        .select('id');
        
      if (error) {
        console.error('Error placing order:', error);
        throw new Error(error.message);
      }
      
      toast.success('Order placed successfully!');
      onOrderPlaced();
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="bg-card shadow-sm">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        <CardDescription>Review your order details and payment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between pb-2 border-b">
            <span className="text-muted-foreground">Specifications</span>
            <span>{printSpecs.paperSize}, {printSpecs.colorMode === 'blackAndWhite' ? 'B&W' : 'Color'}</span>
          </div>
          
          <div className="flex justify-between pb-2 border-b">
            <span className="text-muted-foreground">Document Pages</span>
            <span>{printSpecs.pageCount || 1}</span>
          </div>
          
          <div className="flex justify-between pb-2 border-b">
            <span className="text-muted-foreground">Copies</span>
            <span>{printSpecs.copies}</span>
          </div>
          
          <div className="flex justify-between pb-2 border-b">
            <span className="text-muted-foreground">Double-sided</span>
            <span>{printSpecs.doubleSided ? 'Yes' : 'No'}</span>
          </div>
          
          <div className="flex justify-between pb-2 border-b">
            <span className="text-muted-foreground">Stapling</span>
            <span>{printSpecs.stapling ? 'Yes' : 'No'}</span>
          </div>
          
          <div className="flex justify-between pb-2 border-b">
            <span className="text-muted-foreground">Price per page</span>
            <span>${printSpecs.pricePerPage?.toFixed(2) || '---'}</span>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex justify-between items-center py-2 font-medium text-lg">
            <span>Total Price</span>
            <span className="flex items-center">
              <DollarSign size={18} className="mr-1" />
              {totalPrice ? totalPrice.toFixed(2) : '---'}
            </span>
          </div>
          
          <div className="text-xs text-muted-foreground mt-1">
            {printSpecs.doubleSided && <p>* 10% discount applied for double-sided printing</p>}
            {printSpecs.stapling && <p>* $0.50 additional fee for stapling</p>}
          </div>
        </div>
        
        {!isFormComplete && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground mt-4">
            <Calculator size={16} />
            <span>Complete all previous steps to place your order</span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full flex items-center gap-2" 
          disabled={!isFormComplete || loading}
          onClick={handlePlaceOrder}
        >
          <CreditCard size={16} />
          {loading ? <Loader2 size={16} className="mr-2" /> : 'Place Order'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PaymentCalculator;
