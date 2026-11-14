import { onRequestPost as handleStripePost, onRequestGet as handleStripeGet } from '../webhooks/stripe';

export const onRequestPost = handleStripePost;
export const onRequestGet = handleStripeGet;
