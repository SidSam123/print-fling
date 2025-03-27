
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Define Google Pay API types in a way that won't conflict with other declarations
declare global {
  interface Window {
    google: any; // Use any for the global google object to avoid conflicts
  }
}

interface GooglePayButtonProps {
  amount: number;
  onPaymentSuccess: () => void;
  disabled?: boolean;
}

const GooglePayButton = ({ amount, onPaymentSuccess, disabled = false }: GooglePayButtonProps) => {
  const [loading, setLoading] = useState(true);
  const [paymentClient, setPaymentClient] = useState<any>(null);
  const [isGooglePayAvailable, setIsGooglePayAvailable] = useState(false);
  const [buttonEl, setButtonEl] = useState<HTMLElement | null>(null);

  // Prepare the Google Pay API
  useEffect(() => {
    const loadGooglePayApi = async () => {
      // Make sure Google Pay API is available
      if (!window.google?.payments?.api) {
        const script = document.createElement('script');
        script.src = 'https://pay.google.com/gp/p/js/pay.js';
        script.async = true;
        script.onload = initGooglePay;
        document.body.appendChild(script);
      } else {
        initGooglePay();
      }
    };

    const initGooglePay = async () => {
      if (!window.google?.payments?.api) {
        console.error('Google Pay API not available');
        setLoading(false);
        return;
      }

      try {
        // Initialize a Google Pay API client
        const client = new window.google.payments.api.PaymentsClient({
          environment: 'TEST' // Using test environment as requested
        });
        
        setPaymentClient(client);
        
        // Check whether Google Pay is available for the user
        const isReadyToPayRequest = {
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [{
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['MASTERCARD', 'VISA']
            }
          }]
        };
        
        const response = await client.isReadyToPay(isReadyToPayRequest);
        setIsGooglePayAvailable(response.result);
        
        if (response.result) {
          // Create the Google Pay button
          const button = client.createButton({
            onClick: onGooglePayButtonClick,
            buttonColor: 'black',
            buttonType: 'pay',
            buttonSizeMode: 'fill'
          });
          
          setButtonEl(button);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Google Pay initialization error:', error);
        setLoading(false);
      }
    };

    loadGooglePayApi();
    
    // Cleanup
    return () => {
      // Clean up any listeners if needed
    };
  }, []);

  // Handle Google Pay button click
  const onGooglePayButtonClick = async () => {
    if (!paymentClient) return;
    
    try {
      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['MASTERCARD', 'VISA']
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'example',
              gatewayMerchantId: 'exampleGatewayMerchantId'
            }
          }
        }],
        merchantInfo: {
          merchantId: '12345678901234567890',
          merchantName: 'InstaPrint'
        },
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: amount.toFixed(2),
          currencyCode: 'INR'
        }
      };
      
      const paymentData = await paymentClient.loadPaymentData(paymentDataRequest);
      console.log('Payment success', paymentData);
      
      // Handle the payment success
      toast.success('Payment successful!');
      onPaymentSuccess();
      
    } catch (error: any) {
      console.error('Error loading payment data', error);
      
      if (error.statusCode === 'CANCELED') {
        toast.info('Payment cancelled');
      } else {
        toast.error('Payment failed. Please try again.');
      }
    }
  };

  // Custom button component that will trigger Google Pay
  const handleCustomButtonClick = () => {
    if (buttonEl) {
      // Programmatically click the Google Pay button
      buttonEl.click();
    } else {
      toast.error('Google Pay is not available');
    }
  };

  if (loading) {
    return (
      <Button disabled className="w-full">
        <Loader2 size={16} className="animate-spin mr-2" />
        Loading payment options...
      </Button>
    );
  }

  if (!isGooglePayAvailable) {
    return (
      <Button disabled className="w-full">
        Google Pay is not available
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleCustomButtonClick}
      disabled={disabled}
      className="w-full bg-black hover:bg-gray-800"
    >
      Pay with Google Pay
    </Button>
  );
};

export default GooglePayButton;
