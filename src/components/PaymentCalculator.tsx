
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PrintSpecs } from '@/components/PrintSpecifications';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LucideIndianRupee, Calculator } from 'lucide-react';

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
  const [orderId, setOrderId] = useState<string | null>(null);
  
  // Load the Razorpay script when component mounts
  useEffect(() => {
    const loadRazorpayScript = () => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
      script.async = true;
      script.dataset.payment_button_id = 'pl_MzMLRg8qBmJFbQ'; // Replace with your actual Razorpay payment button ID
      
      // Get the razorpay-payment container element
      const container = document.getElementById('razorpay-payment-button-container');
      
      // Only append if container exists and it doesn't already have the script
      if (container && !container.querySelector('script')) {
        container.appendChild(script);
      }
    };

    // Only load script if we have a valid order ID
    if (orderId) {
      loadRazorpayScript();
    }
  }, [orderId]);
  
  const calculateTotalPrice = () => {
    if (!printSpecs.pricePerPage) return 0;
    
    // Base calculation - price per page × total pages × number of copies
    let totalPages = printSpecs.pageCount;
    
    // If double-sided, we need to adjust the effective page count for pricing
    // (but we don't reduce the actual number of pages that need to be printed)
    let effectivePages = totalPages;
    if (printSpecs.doubleSided && totalPages > 1) {
      // For double-sided, we calculate ceiling of pages/2 for sheets needed
      // then multiply by 2 for actual printed sides
      const sheetsNeeded = Math.ceil(totalPages / 2);
      effectivePages = sheetsNeeded * 2;
    }
    
    // Calculate base price using the correct price per page from the shop's pricing
    const basePrice = printSpecs.pricePerPage * effectivePages * printSpecs.copies;
    
    // Apply stapling fee if enabled (Rs 5.00 per document)
    const staplingFee = printSpecs.stapling ? 5.00 * printSpecs.copies : 0;
    
    // Return the total, rounded to 2 decimal places
    return Math.round((basePrice + staplingFee) * 100) / 100;
  };

  const handleCreateOrder = async () => {
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
        console.error('Error creating order:', error);
        throw new Error(error.message);
      }
      
      if (data && data[0]) {
        setOrderId(data[0].id);
        toast.success('Order created! Please complete payment.');
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePlaceOrder = async () => {
    if (orderId) {
      // If we already have an order ID, it means payment is complete
      onOrderPlaced();
    } else {
      // Create the order first, which will then show the payment button
      await handleCreateOrder();
    }
  };
  
  // Calculate if form is complete and ready for order creation
  const isFormComplete = user && shopId && documentPath && printSpecs.pricePerPage !== null;
  
  // Calculate total price
  const totalPrice = calculateTotalPrice();
  
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
            <span>{printSpecs.paperSize}, {printSpecs.colorMode === 'bw' ? 'B&W' : 'Color'}</span>
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
            <span className='flex items-center'><LucideIndianRupee size={14} className="mr-1" />{printSpecs.pricePerPage?.toFixed(2) || '---'}</span>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex justify-between items-center py-2 font-medium text-lg">
            <span>Total Price</span>
            <span className="flex items-center">
              <LucideIndianRupee size={18} className="mr-1" />
              {totalPrice.toFixed(2)}
            </span>
          </div>
          
          <div className="text-xs text-muted-foreground mt-1">
            {printSpecs.stapling && <p>* ₹5.00 additional fee for stapling per copy</p>}
          </div>
        </div>
        
        {!isFormComplete && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground mt-4">
            <Calculator size={16} />
            <span>Complete all previous steps to place your order</span>
          </div>
        )}
        
        {orderId ? (
          <div className="mt-4">
            <div className="text-center mb-2 text-sm text-muted-foreground">Please complete your payment</div>
            <div id="razorpay-payment-button-container" className="flex justify-center"></div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full flex items-center gap-2" 
          disabled={!isFormComplete || loading}
          onClick={handlePlaceOrder}
        >
          {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
          {loading ? 'Processing...' : orderId ? 'Complete Payment' : 'Place Order'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PaymentCalculator;
