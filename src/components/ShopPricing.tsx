
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ShopPricingProps {
  shopId: string;
}

interface PricingItem {
  id?: string;
  paper_size: string;
  color_mode: string;
  price_per_page: number;
}

interface FormValues {
  paper_size: string;
  color_mode: string;
  price_per_page: string;
}

const PAPER_SIZES = ['A4', 'A3', 'Letter', 'Legal'];
const COLOR_MODES = [
  { value: 'bw', label: 'Black & White' },
  { value: 'color', label: 'Color' }
];

const ShopPricing: React.FC<ShopPricingProps> = ({ shopId }) => {
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    defaultValues: {
      paper_size: '',
      color_mode: '',
      price_per_page: ''
    }
  });
  
  // Fetch pricing data for the shop
  const fetchPricing = async () => {
    if (!shopId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_pricing')
        .select('*')
        .eq('shop_id', shopId)
        .order('paper_size', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      setPricing(data || []);
    } catch (error: any) {
      console.error('Error fetching pricing:', error);
      toast.error(error.message || 'Failed to load pricing information');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPricing();
  }, [shopId]);
  
  const handleAddPricing = async (values: FormValues) => {
    if (!shopId) return;
    
    try {
      setSubmitting(true);
      
      // Check if this combination already exists
      const exists = pricing.some(
        p => p.paper_size === values.paper_size && p.color_mode === values.color_mode
      );
      
      if (exists) {
        toast.error('Pricing for this paper size and color mode already exists');
        return;
      }
      
      const { error } = await supabase
        .from('shop_pricing')
        .insert({
          shop_id: shopId,
          paper_size: values.paper_size,
          color_mode: values.color_mode,
          price_per_page: parseFloat(values.price_per_page)
        });
        
      if (error) {
        throw error;
      }
      
      toast.success('Pricing added successfully');
      form.reset();
      fetchPricing();
    } catch (error: any) {
      console.error('Error adding pricing:', error);
      toast.error(error.message || 'Failed to add pricing');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDeletePricing = async (id: string) => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('shop_pricing')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      toast.success('Pricing removed successfully');
      fetchPricing();
    } catch (error: any) {
      console.error('Error deleting pricing:', error);
      toast.error(error.message || 'Failed to remove pricing');
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pricing Configuration</CardTitle>
          <CardDescription>
            Set prices for different paper sizes and print options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(handleAddPricing)} 
              className="grid gap-4 md:grid-cols-4"
            >
              <FormField
                control={form.control}
                name="paper_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paper Size</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={submitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAPER_SIZES.map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="color_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Print Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={submitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COLOR_MODES.map(mode => (
                          <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="price_per_page"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Per Page</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        disabled={submitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-end">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Pricing
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
          
          <div className="mt-8">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pricing.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paper Size</TableHead>
                    <TableHead>Print Type</TableHead>
                    <TableHead>Price Per Page</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricing.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.paper_size}</TableCell>
                      <TableCell>
                        {item.color_mode === 'bw' ? 'Black & White' : 'Color'}
                      </TableCell>
                      <TableCell>${parseFloat(item.price_per_page.toString()).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => item.id && handleDeletePricing(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No pricing configured yet. Add your first pricing option above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopPricing;
