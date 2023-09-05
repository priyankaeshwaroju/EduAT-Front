import { mongooseConnect } from "@/lib/mongoose";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(400).json({ message: "Request must be a POST request" });
    return;
  }

  try {
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

    for (const productId of uniqueIds) {
      const productInfo = productsInfos.find(
        (p) => p._id.toString() === productId
      );
      const quantity =
        productsIds.filter((id) => id === productId)?.length || 0;

      if (quantity > 0 && productInfo) {
        line_items.push({
          quantity,
          price_data: {
            product_data: { name: productInfo.title },
          },
        });

        emailContent += `
          <p>Product: ${productInfo.title}</p>
          <p>Quantity: ${quantity}</p>`;
      }
    }

    const adminEmails = ["2544678@dundee.ac.uk", "darthbrush@gmail.com"];
    const msg = {
      to: email,
      from: "priyankaeshwaroju325@gmail.com",
      subject: "Loan Request Confirmation",
      text: "Thank you for your order!",
      html: emailContent,
    };

    const adminMsgs = adminEmails.map((adminEmail) => ({
      to: adminEmail,
      from: "priyankaeshwaroju325@gmail.com",
      subject: "New Loan Request",
      text: "A new loan request has been submitted!",
      html: `A new loan request has been submitted by ${name}.`,
    }));

    await sgMail.send(msg);
    await sgMail.send([...adminMsgs]);
    console.log("Email sent successfully");

    // Save order details
    const order = new Order({
      name,
      email,
      city,
      postalCode,
      streetAddress,
      country,
      line_items,
    });
    await order.save();

    res.status(200).json({ message: "Loan request submitted successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Error submitting loan request" });
  }
}
