import Stripe from "stripe";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { Subscription } from "../../models/subscription.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret =
  "whsec_846e6c72dd4355bdc69b08b6b9faf1e59ffd3b4c60624d70de3d29a34e4e6107";

const subscriptionCheckoutSession = asyncHandler(async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    client_reference_id: req.user._id,
    line_items: [
      {
        name: "Paid Plan",
        amount: 30 * 100,
        currency: "inr",
        quantity: 1,
      },
    ],
    payment_method_types: ["card"],
    mode: "payment",
    success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: process.env.STRIPE_CANCEL_URL,
  });
  res.redirect(303, session.url);
});

const stripeWebhook = asyncHandler(async (req, res) => {
  const sig = request.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      const paymentDetails = await Subscription.create({
        userId: session.client_reference_id,
        paymentId: session.id,
        price: session.amount_total / 100,
        paymentStatus: "COMPLETED",
      });
      console.log(paymentDetails);
      break;
    case "checkout.session.expired":
      const expiredSession = event.data.object;
      const expiredPayment = await Subscription.create({
        userId: expiredSession.client_reference_id,
        paymentId: expiredSession.id,
        price: expiredSession.amount_total / 100,
        paymentStatus: "FAILED",
      });
      console.log(expiredPayment);
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
});

export { subscriptionCheckoutSession, stripeWebhook };
