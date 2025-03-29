
import React, { useState, useEffect, useRef } from 'react';
import { CalendarDays, FileText, Clock, Printer, AlertTriangle, CheckCircle, Eye, LucideIndianRupee } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type PrintJob = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  shop_id: string;
  paper_size: string;
  color_mode: string;
  copies: number;
  double_sided: boolean;
  stapling: boolean;
  price: number;
  file_path: string;
  shop_name?: string;
};

const statusStyles = {
  pending: {
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: Clock,
  },
  completed: {
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: CheckCircle,
  },
  cancelled: {
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: AlertTriangle,
  },
};

const ActiveOrders = () => {
  const { user } = useAuth();
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isMountedRef = useRef<boolean>(true);
  const channelRef = useRef<any>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch print jobs with retry and throttling logic
  const fetchPrintJobs = async (force = false) => {
    if (!user?.id || !isMountedRef.current) return;

    // Throttle fetches to prevent too many requests
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < 3000) {
      console.log('Throttling fetchPrintJobs request');
      return;
    }
    
    lastFetchTimeRef.current = now;
    
    try {
      console.log(`Fetching print jobs for user: ${user.id}`);
      
      const { data: jobsData, error: jobsError } = await supabase
        .from('print_jobs')
        .select('*')
        .eq('customer_id', user.id)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false });

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        if (isMountedRef.current) {
          setError('Failed to load your orders');
          setRetryCount(prev => prev + 1);
        }
        return;
      }

      if (!jobsData || jobsData.length === 0) {
        console.log('No active print jobs found');
        if (isMountedRef.current) {
          setPrintJobs([]);
          setError(null);
          setLoading(false);
        }
        return;
      }

      const shopIds = [...new Set(jobsData.map(job => job.shop_id))];
      
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('id, name')
        .in('id', shopIds);

      if (shopsError) {
        console.error('Error fetching shops:', shopsError);
        if (isMountedRef.current) {
          setError('Failed to load shop details');
          setRetryCount(prev => prev + 1);
        }
        return;
      }

      const jobsWithShopNames = jobsData.map(job => ({
        ...job,
        shop_name: shopsData?.find(s => s.id === job.shop_id)?.name || 'Unknown Shop',
      }));

      console.log(`Successfully loaded ${jobsWithShopNames.length} print jobs`);
      
      if (isMountedRef.current) {
        setPrintJobs(jobsWithShopNames);
        setError(null);
        setLoading(false);
        // Reset retry count on success
        setRetryCount(0);
      }
    } catch (error: any) {
      console.error('Error in fetchPrintJobs:', error);
      if (isMountedRef.current) {
        setError('An unexpected error occurred');
        setRetryCount(prev => prev + 1);
      }
    }
  };

  // Set up realtime subscription to listen for changes
  const setupRealtimeSubscription = () => {
    if (!user?.id || !isMountedRef.current) {
      console.log('Cannot setup realtime: missing user ID or component unmounted');
      return;
    }

    // Clean up existing channel if any
    if (channelRef.current) {
      console.log('Removing existing channel subscription');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create a unique channel name
    const channelName = `active_orders_${user.id}_${Date.now()}`;
    console.log(`Setting up new realtime channel: ${channelName}`);

    try {
      channelRef.current = supabase
        .channel(channelName)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'print_jobs',
            filter: `customer_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('Received realtime update:', payload);
            if (isMountedRef.current) {
              fetchPrintJobs(true);
            }
          }
        )
        .subscribe((status) => {
          console.log(`Realtime subscription status for ${channelName}:`, status);
          
          // If subscription fails, fall back to polling
          if (status !== 'SUBSCRIBED' && isMountedRef.current) {
            console.log('Realtime subscription failed, falling back to polling');
            startPolling();
          }
        });
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
      // Fall back to polling if realtime setup fails
      if (isMountedRef.current) {
        startPolling();
      }
    }
  };

  // Start polling as a fallback mechanism
  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    console.log('Starting polling for updates every 10 seconds');
    pollingIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        console.log('Polling: fetching print jobs');
        fetchPrintJobs();
      }
    }, 10000);
  };

  // Effect to initialize data and subscriptions
  useEffect(() => {
    console.log('ActiveOrders component mounted');
    isMountedRef.current = true;
    
    const initializeComponent = async () => {
      if (!user?.id) {
        console.log('No user ID available, waiting...');
        return;
      }
      
      // Initial data fetch
      await fetchPrintJobs(true);
      
      // Set up realtime subscription
      setupRealtimeSubscription();
    };
    
    initializeComponent();
    
    // Handle visibility changes (tab switching)
    const handleVisibilityChange = () => {
      console.log('Document visibility changed:', document.visibilityState);
      
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        console.log('Tab is now visible, refreshing data');
        fetchPrintJobs(true);
        
        // Re-establish realtime connection when tab becomes visible
        setupRealtimeSubscription();
      }
    };
    
    // Add event listener for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup function
    return () => {
      console.log('ActiveOrders component unmounting');
      isMountedRef.current = false;
      
      // Remove realtime subscription
      if (channelRef.current) {
        console.log('Cleaning up channel subscription');
        supabase.removeChannel(channelRef.current);
      }
      
      // Clear polling interval
      if (pollingIntervalRef.current) {
        console.log('Clearing polling interval');
        clearInterval(pollingIntervalRef.current);
      }
      
      // Remove event listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  // Auto-retry logic for errors
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | null = null;
    
    if (error && retryCount < 3 && isMountedRef.current) {
      console.log(`Auto-retrying fetch (attempt ${retryCount + 1} of 3)`);
      const delay = Math.min(2000 * (retryCount + 1), 10000); // Exponential backoff
      
      retryTimeout = setTimeout(() => {
        if (isMountedRef.current) {
          fetchPrintJobs(true);
        }
      }, delay);
    }
    
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [error, retryCount]);

  const cancelOrder = async (jobId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('print_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId)
        .eq('customer_id', user.id);

      if (error) throw error;

      // We'll rely on the realtime update to refresh the UI
      toast.success('Order cancelled successfully');
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(error.message || 'Failed to cancel order');
    }
  };

  const viewDocument = async (filePath: string) => {
    try {
      setViewingDocument(filePath);
      
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      setDocumentUrl(data.publicUrl);
    } catch (error) {
      console.error('Error getting document URL:', error);
      toast.error('Failed to load the document');
      setViewingDocument(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>My Active Orders</CardTitle>
          <CardDescription>
            Track and manage your current print jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 mb-4">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <Skeleton key={j} className="h-4 w-24" />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>My Active Orders</CardTitle>
          <CardDescription>
            Track and manage your current print jobs
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          <div className="p-5 bg-red-100 rounded-full mb-5">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-red-500">Error Loading Orders</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-2 text-center">
            {error}. Please try refreshing the page.
          </p>
          <Button 
            className="mt-6" 
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchPrintJobs(true);
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (printJobs.length === 0) {
    return (
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>My Active Orders</CardTitle>
          <CardDescription>
            Track and manage your current print jobs
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          <div className="p-5 bg-muted rounded-full mb-5">
            <FileText size={48} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No active orders</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-2 text-center">
            You don't have any active print orders. Create a new print job to get started.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/print-order">New Print Job</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Success state with data
  return (
    <>
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>My Active Orders</CardTitle>
          <CardDescription>
            Track and manage your current print jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {printJobs.map((job) => {
              const status = job.status as keyof typeof statusStyles;
              const StatusIcon = statusStyles[status]?.icon || Clock;

              return (
                <div 
                  key={job.id}
                  className="p-4 border rounded-lg flex flex-col space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className={`p-2 rounded-full ${statusStyles[status]?.bgColor || 'bg-gray-100'}`}>
                        <StatusIcon size={18} className={`${statusStyles[status]?.textColor || 'text-gray-800'}`} />
                      </div>
                      <div>
                        <h4 className="font-medium">{job.shop_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${statusStyles[status]?.textColor || ''} ${statusStyles[status]?.bgColor || ''}`}
                    >
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Paper:</span> {job.paper_size}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Color:</span> {job.color_mode === 'bw' ? 'B&W' : 'Color'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Copies:</span> {job.copies}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Double-sided:</span> {job.double_sided ? 'Yes' : 'No'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stapling:</span> {job.stapling ? 'Yes' : 'No'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price:</span> <span className="flex items-center"><LucideIndianRupee size={14} className="mr-0.5" />{job.price?.toFixed(2)}</span>  
                    </div>
                  </div>
                  
                  <div className="pt-2 flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => viewDocument(job.file_path)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Document
                    </Button>
                    
                    {job.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => cancelOrder(job.id)}
                      >
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {documentUrl && (
              <iframe 
                src={documentUrl} 
                className="w-full h-full min-h-[70vh]" 
                title="Document Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActiveOrders;
