
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PrintSpecs } from '@/components/PrintSpecifications';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, IndianRupee, Calculator, QrCode, Copy, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [shopUpiId, setShopUpiId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi'>('razorpay');
  const [copied, setCopied] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  
  useEffect(() => {
    // Fetch shop details to get UPI ID
    const fetchShopDetails = async () => {
      if (!shopId) return;
      
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('upi_id')
          .eq('id', shopId)
          .single();
          
        if (error) {
          console.error('Error fetching shop UPI ID:', error);
          return;
        }
        
        if (data && data.upi_id) {
          setShopUpiId(data.upi_id);
        }
      } catch (error) {
        console.error('Error in fetchShopDetails:', error);
      }
    };
    
    fetchShopDetails();
  }, [shopId]);
  
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
    if (orderId && paymentMethod === 'razorpay') {
      loadRazorpayScript();
    }
  }, [orderId, paymentMethod]);
  
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
          status: 'pending',
          payment_status: 'pending'
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
  
  const handleCopyUpiId = () => {
    if (shopUpiId) {
      navigator.clipboard.writeText(shopUpiId);
      setCopied(true);
      toast.success('UPI ID copied to clipboard');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!orderId) return;
    
    try {
      setPaymentVerifying(true);
      
      // Update payment status in the database
      const { error } = await supabase
        .from('print_jobs')
        .update({ payment_status: 'completed' })
        .eq('id', orderId);
        
      if (error) throw error;
      
      toast.success('Payment verified! Your order has been placed.');
      setOrderCompleted(true);
      // Wait a bit before notifying parent component
      setTimeout(() => {
        onOrderPlaced();
      }, 1500);
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      toast.error('Failed to verify payment. Please try again.');
    } finally {
      setPaymentVerifying(false);
    }
  };
  
  const handlePlaceOrder = async () => {
    if (orderId) {
      // If we already have an order ID, it means payment is complete
      if (orderCompleted) {
        onOrderPlaced();
      } else if (paymentMethod === 'upi') {
        await handleMarkAsPaid();
      }
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
            <span className='flex items-center'><IndianRupee size={14} className="mr-1" />{printSpecs.pricePerPage?.toFixed(2) || '---'}</span>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex justify-between items-center py-2 font-medium text-lg">
            <span>Total Price</span>
            <span className="flex items-center">
              <IndianRupee size={18} className="mr-1" />
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
        
        {orderId && !orderCompleted && (
          <div className="mt-4 space-y-4">
            <Separator />
            
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">Select payment method:</div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={paymentMethod === 'razorpay' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('razorpay')}
                >
                  Razorpay
                </Button>
                {shopUpiId && (
                  <Button 
                    size="sm" 
                    variant={paymentMethod === 'upi' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('upi')}
                  >
                    UPI
                  </Button>
                )}
              </div>
            </div>
            
            {paymentMethod === 'razorpay' && (
              <div className="space-y-4">
                <div className="text-center mb-2 text-sm text-muted-foreground">Pay securely via Razorpay</div>
                <div id="razorpay-payment-button-container" className="flex justify-center">
                  {/* Razorpay button will be injected here */}
                  <Button 
                    className="w-full"
                    onClick={() => {
                      toast.success('This is a test environment. In production, the Razorpay payment flow would appear here.');
                      setOrderCompleted(true);
                      setTimeout(() => {
                        onOrderPlaced();
                      }, 1500);
                    }}
                  >
                    Pay ₹{totalPrice.toFixed(2)} with Razorpay
                  </Button>
                </div>
              </div>
            )}
            
            {paymentMethod === 'upi' && shopUpiId && (
              <div className="space-y-4">
                <div className="text-center mb-2 text-sm font-medium">Pay using any UPI app</div>
                
                <div className="bg-muted/30 p-4 rounded-lg flex flex-col items-center space-y-4">
                  <div className="p-4 bg-white rounded-md">
                    <QrCode size={120} className="text-primary" />
                  </div>
                  
                  <div className="text-center space-y-1">
                    <p className="text-sm text-muted-foreground">Scan QR code or use UPI ID</p>
                    <div className="flex items-center justify-center gap-2">
                      <Input 
                        value={shopUpiId}
                        readOnly
                        className="text-center max-w-[200px]"
                      />
                      <Button size="icon" variant="outline" onClick={handleCopyUpiId}>
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </Button>
                    </div>
                  </div>
                  
                  <Alert variant="outline">
                    <AlertDescription className="text-sm">
                      Once you've completed the payment, click the "I've Paid" button below.
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    variant="default" 
                    className="w-full" 
                    onClick={handleMarkAsPaid}
                    disabled={paymentVerifying}
                  >
                    {paymentVerifying ? 'Verifying...' : 'I\'ve Paid ₹' + totalPrice.toFixed(2)}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {orderCompleted && (
          <div className="mt-4 p-4 bg-green-50 text-green-800 rounded-lg text-center">
            <Check size={24} className="mx-auto mb-2" />
            <p className="font-medium">Payment received!</p>
            <p className="text-sm">Your order has been placed successfully.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!orderId ? (
          <Button 
            className="w-full flex items-center gap-2" 
            disabled={!isFormComplete || loading}
            onClick={handlePlaceOrder}
          >
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            {loading ? 'Processing...' : 'Place Order'}
          </Button>
        ) : orderCompleted ? (
          <Button 
            className="w-full" 
            onClick={() => onOrderPlaced()}
          >
            Continue to Dashboard
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
};

export default PaymentCalculator;
