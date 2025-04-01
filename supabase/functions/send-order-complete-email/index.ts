
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Supabase client with the auth context of the function
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface RequestBody {
  orderId: string;
}

serve(async (req) => {
  console.log("Email notification function invoked");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const requestData: RequestBody = await req.json();
    const { orderId } = requestData;

    if (!orderId) {
      console.error("Missing orderId in request");
      return new Response(
        JSON.stringify({ error: "Order ID is required" }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    console.log(`Processing order completion email for order: ${orderId}`);

    // Get the order details with customer info - using a direct join to get the customer's email
    const { data: order, error: orderError } = await supabase
      .from('print_jobs')
      .select(`
        *,
        profiles:customer_id(name, email)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error("Error fetching order:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found", details: orderError }),
        { 
          status: 404, 
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    console.log("Retrieved order details:", JSON.stringify(order, null, 2));

    // Get shop details
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('name, address, phone')
      .eq('id', order.shop_id)
      .single();

    if (shopError || !shop) {
      console.error("Error fetching shop:", shopError);
      return new Response(
        JSON.stringify({ error: "Shop details not found", details: shopError }),
        { 
          status: 404, 
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    // Get customer profile directly if the join didn't work
    let customerEmail = order.profiles?.email;
    let customerName = order.profiles?.name || "Customer";

    // If no email found in the join, try a direct query
    if (!customerEmail) {
      console.log(`No email found in join, fetching directly for customer ID: ${order.customer_id}`);
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', order.customer_id)
        .single();
        
      if (profileError) {
        console.error("Error fetching customer profile:", profileError);
      } else if (userProfile) {
        customerEmail = userProfile.email;
        customerName = userProfile.name || "Customer";
        console.log(`Found customer email directly: ${customerEmail}`);
      }
    }

    if (!customerEmail) {
      console.error("Customer email not found even after direct query");
      return new Response(
        JSON.stringify({ error: "Customer email not found" }),
        { 
          status: 404, 
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    // Create email content
    const emailSubject = `Your print order is ready for pickup - Order #${orderId.substring(0, 8)}`;
    
    const emailHtml = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
            .order-info { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .shop-info { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Your Print Order is Ready!</h1>
          </div>
          <div class="content">
            <p>Hello ${customerName},</p>
            <p>Great news! Your print order has been completed and is ready for pickup.</p>
            
            <div class="order-info">
              <h3>Order Details:</h3>
              <p><strong>Order ID:</strong> #${orderId.substring(0, 8)}</p>
              <p><strong>Paper Size:</strong> ${order.paper_size}</p>
              <p><strong>Color:</strong> ${order.color_mode === 'bw' ? 'Black & White' : 'Color'}</p>
              <p><strong>Copies:</strong> ${order.copies}</p>
              <p><strong>Double-sided:</strong> ${order.double_sided ? 'Yes' : 'No'}</p>
              <p><strong>Stapling:</strong> ${order.stapling ? 'Yes' : 'No'}</p>
              <p><strong>Total Amount:</strong> ₹${order.price?.toFixed(2) || '0.00'}</p>
            </div>
            
            <div class="shop-info">
              <h3>Pickup Location:</h3>
              <p><strong>Shop:</strong> ${shop.name}</p>
              <p><strong>Address:</strong> ${shop.address}</p>
              ${shop.phone ? `<p><strong>Phone:</strong> ${shop.phone}</p>` : ''}
            </div>
            
            <p>Please bring your order ID when you come to collect your prints.</p>
            <p>Thank you for using our service!</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `;

    console.log(`Sending email to ${customerEmail}`);

    // Send the email using Supabase auth.admin.sendEmail
    const { error: emailError } = await supabase.auth.admin.sendEmail(
      customerEmail,
      {
        subject: emailSubject,
        html: emailHtml,
      }
    );

    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    console.log(`Email sent successfully to ${customerEmail} for order ${orderId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Order completion email sent to ${customerEmail}` 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  } catch (error) {
    console.error("Unexpected error in send-order-complete-email function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
