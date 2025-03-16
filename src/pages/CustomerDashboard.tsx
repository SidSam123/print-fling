
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import UserRedirect from '@/components/UserRedirect';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, Map, Clock, FileText } from 'lucide-react';

const CustomerDashboard = () => {
  const { user } = useAuth();
  
  return (
    <UserRedirect requiredRole="customer">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Navbar />
        
        <div className="container px-4 md:px-6 pt-28 pb-16 md:pt-36 md:pb-20">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">Print Customer Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Welcome back, {user?.name || 'Customer'}
                </p>
              </div>
              
              <Button className="flex items-center gap-2">
                <FileUp size={16} />
                New Print Job
              </Button>
            </div>
            
            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="grid grid-cols-3 max-w-md mb-8">
                <TabsTrigger value="orders">My Orders</TabsTrigger>
                <TabsTrigger value="shops">Print Shops</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="orders" className="space-y-6">
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle>My Active Orders</CardTitle>
                    <CardDescription>
                      Track and manage your current print jobs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center py-8">
                    <FileText size={64} className="text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No active orders</h3>
                    <p className="text-sm text-muted-foreground max-w-md mt-2 text-center">
                      You don't have any active print orders. Create a new print job to get started.
                    </p>
                    <Button className="mt-6 flex items-center gap-2">
                      <FileUp size={16} />
                      New Print Job
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="shops">
                <Card>
                  <CardHeader>
                    <CardTitle>Find Print Shops</CardTitle>
                    <CardDescription>
                      Browse nearby print shops to place your order
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Map size={64} className="text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">Explore Print Shops</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        Browse available print shops in your area
                      </p>
                      <Button className="mt-6">View Map</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>
                      View your past print orders
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock size={64} className="text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No order history</h3>
                    <p className="text-sm text-muted-foreground max-w-md mt-2">
                      Your completed print orders will appear here
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </UserRedirect>
  );
};

export default CustomerDashboard;
