

# 📄 Full Specification: Automated Affiliate Commission Payment System Using rasor pay



## 1. Introduction

This system automates affiliate commission payments by generating payment links that collect full payments into the business account and automatically pay commissions to affiliates. Additionally, it automates subscription approvals upon successful payment, replacing the current manual approval process.

---

## 2. User Interface (Frontend) Flow

### 2.1 Settings Page

* The **Generate Payment Link** feature will be available **only on the `app` subdomain**:

  * URL: `app.studysimplify.in`
  * On any other subdomain, the **"Generate Payment Link"** button will **not be shown**.
* Inside the user **Settings Page** on the `app` subdomain, add a button labeled:

  * **"Generate Payment Link"**

### 2.2 Generating the Payment Link

* When an affiliate (e.g., X) clicks the **"Generate Payment Link"** button:

  * Show a prompt/input form that asks:

    * **Enter your UPI ID** (This is the affiliate’s payment receiving ID)
    * **Enter payment amount** (optional, if variable)
  * On clicking **Generate**:

    * The system calls rasor pay API to generate a payment link that:

      * Collects **100% payment** into the business’s main rasor pay account.
      * Embeds metadata about the affiliate (including the UPI ID entered).
  * The payment link is shown to the affiliate (X) to copy and send to the buyer (Y).

---

## 3. Payment Process

### 3.1 Buyer (Y) Action

* Buyer (Y) receives the payment link and completes the payment using rasor pay.

### 3.2 Payment Confirmation & Auto-Approval

* rasor pay sends a **webhook notification** to your backend with payment details.
* Upon verifying successful payment:

  * The system **automatically approves** the buyer’s account upgrade (subscription activation).
  * This **replaces the current manual approval step** on the "owner\_management" page.
  * The buyer’s account status is updated to "Active" or "Subscribed" immediately after payment.

---

## 4. Backend Logic & Automation

### 4.1 Webhook Handling

* On receiving webhook:

  * Verify payment success.
  * Extract payment amount and affiliate details (e.g., affiliate UPI ID).
  * Automatically update the buyer’s account status to active/subscribed.
  * Log payment and approval status.

### 4.2 Commission Calculation

* Calculate commission based on a fixed split (e.g., 20% to affiliate, 80% to business).
* Commission amount = Total Paid Amount × 20%

### 4.3 Commission Payout (Auto-Pay)

* Using rasor pay **Payout API**, automatically send the commission amount to the affiliate’s UPI ID entered earlier.
* Log payout status for monitoring and retries if failed.

---

## 5. Technical Setup Summary

| Feature                     | Details                                                               |
| --------------------------- | --------------------------------------------------------------------- |
| Payment Link Generation     | rasor pay Payment Link API, with affiliate UPI as metadata             |
| Webhook Endpoint            | `https://app.studysimplify.in/webhook/payment-status`                 |
| Commission Rate             | Fixed 20% of total payment amount                                     |
| Commission Payout           | rasor pay Payout API, UPI ID of affiliate                              |
| UI Elements                 | Button on Settings (only on `app` subdomain): "Generate Payment Link" |
| Prompt Inputs               | Affiliate UPI ID, (optional) amount                                   |
| Auto-Approval After Payment | Automatically activate subscription on payment success webhook        |

---

## 6. Why This is Needed

* Automates commission payments, eliminating manual calculations and delays.
* Ensures transparency and timely commission payout to affiliates.
* Simplifies affiliate onboarding by just requiring UPI ID input, no separate rasor pay account needed.
* Maintains a smooth customer purchase experience with a single payment link.
* Restricts link generation feature only to a controlled subdomain (`app`) for security and management.
* Automates subscription activation, removing manual approval bottleneck, improving customer experience and reducing workload.

---

## 7. Security & Compliance

* Securely store affiliate UPI IDs encrypted.
* Validate webhook requests from rasor pay to prevent fake triggers.
* Handle payout failures with retries and alert system admin.
* Ensure user account status updates are transactional and logged.

---

## 8. Possible Extensions

* Add affiliate registration for advanced tracking.
* Build reports for affiliate earnings.
* Integrate notification system (email/SMS) for payouts and subscription status changes.

---

Let me know if you want me to help build API specs, webhook handler pseudocode, or flowcharts next!



Here is a summary : 
Step 1: Payment Links
 You can use rasor pay to create special payment links for customers. These links can have details like who the affiliate is, so you know who brought the customer.

Step 2: Collecting Money
 When a customer pays using the link, the money goes straight into your business account through rasor pay. No problem here!

Step 3: Knowing the Payment Happened
 rasor pay can send you a message (called a webhook) as soon as the payment is done. This happens automatically and tells your system, “Hey, someone paid!”

Step 4: Figuring Out the Commission
 Your system can look at the payment (say, ₹1000) and calculate the commission for the affiliate (like 20%, which is ₹200). This part is done by your own setup, not rasor pay, but it’s easy to do.

Step 5: Paying the Affiliate
 rasor pay has a tool (called the Wire Payout API) that lets you send money instantly to the affiliate’s UPI ID (like their phone number or email linked to UPI). So, the ₹200 can go to them right away.



