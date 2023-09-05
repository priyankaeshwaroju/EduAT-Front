import { mongooseConnect } from "@/lib/mongoose";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.json("should be a POST request");
    return;
  }
  const {
    name,
    email,
    city,
    postalCode,
    streetAddress,
    country,
    cartProducts,
  } = req.body;
  await mongooseConnect();
  const productsIds = cartProducts;
  const uniqueIds = [...new Set(productsIds)];
  const productsInfos = await Product.find({ _id: uniqueIds });

  let line_items = [];
  let emailContent = `
    <p>Hello ${name},</p>
    <p>Your loan request has been submitted successfully.</p>
    <p>Your Delivery Address: ${streetAddress}, ${postalCode}, ${city}, ${country}</p>
    <p>Here are the details of your request:</p>
    <!-- Include any loan request details here -->
  `;
  const recipients = [email, "priyankae.be21@uceou.edu"];

  for (const productId of uniqueIds) {
    const productInfo = productsInfos.find(
      (p) => p._id.toString() === productId
    );
    const quantity = productsIds.filter((id) => id === productId)?.length || 0;
    if (quantity > 0 && productInfo) {
      line_items.push({
        quantity,
        price_data: {
          // currency: "USD",
          product_data: { name: productInfo.title },
          // unit_amount: quantity * productInfo.price * 100,
        },
      });
      emailContent += `
        <p>Product: ${productInfo.title}</p>
        <p>Quantity: ${quantity}</p>`;
    }
  }

  const msg = {
    to: recipients, // Recipient's email address
    from: "priyankaeshwaroju325@gmail.com", // Sender's email address (must be a verified sender in SendGrid)
    subject: "Loan Request Confirmation",
    text: "Thank you for your order!", // Text content of the email
    html: emailContent, // HTML content of the email
  };

  try {
    await mongooseConnect();
    const order = new Order({
      name,
      email,
      city,
      postalCode,
      streetAddress,
      country,
      line_items, // Include order line items
    });
    await order.save();

    await sgMail.send(msg);
    console.log("Email sent successfully");
    res.status(200).json({ message: "Loan request submitted successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Error submitting loan request" });
  }
}
