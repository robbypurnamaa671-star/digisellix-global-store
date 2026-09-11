# Digisellix Marketplace

Build a global digital product marketplace web app called “Digisellix”.

All system language, features, dashboards, user flows, menus, and components must be in English.
Only the homepage marketing text should be written in Bahasa Indonesia.
The platform should support multi-vendor sellers, digital product uploads, and global buyers.**

🚀 Core Features (English)
1. Authentication

Email/password register & login

Role-based access: Seller, Buyer

Email verification

Seller onboarding setup

2. Seller Dashboard

Add New Product

Product Fields:

Product Title

Description

Price (USD and IDR)

Upload File (max 2MB, optional)

OR Add Download Link (required if file not uploaded)

Thumbnail Image (optional)

Sales History

Wallet Balance

Withdraw Request

Withdraw Status Tracking

3. Buyer Features

Browse Products

Filters: category, price, popularity, newest

Product Detail Page

Secure Checkout

Order History

Download Page (file or external link)

4. Payment Gateway

Use easy-to-integrate gateways:

Primary: Xendit

(works for global & Indonesian users)

Backup: Stripe

(for international users)

Payment flow:

Buyer selects product

Checkout

Redirect to payment

Webhook → mark payment as paid

Buyer gets immediate access to download

5. Homepage (Bahasa Indonesia ONLY)

Add these sections in Bahasa Indonesia:

Hero Section

Judul: “Jual & Beli Produk Digital Dengan Mudah”

Subjudul: “Platform global untuk kreator menjual e-book, desain, musik, software, template, dan banyak lagi.”

Tombol: “Mulai Jualan Sekarang”

Cara Kerja

Buat Akun

Upload Produk

Terima Pembayaran

Pembeli Mendapatkan Link Unduhan

Keunggulan Digisellix

Pembayaran cepat

Mendukung penjual global

Upload file atau link

Marketplace modern & responsif

🎛 Admin Dashboard (English)

Manage Users

Manage Sellers

Approve Withdrawals

Product Moderation

Payment Logs

Marketplace Settings

Financial Reports

🛠 Technical Requirements

Use Tailwind + shadcn UI

Fully responsive

File storage with 2MB limit

Support link-based delivery

SEO optimized product pages

Global currency support

Secure API for downloads

✔ Expected Output

Lovable should generate a fully functional global digital product marketplace with:

English interface (except homepage text)

Multi-vendor system

File upload (2MB) or external download link

Payment via Xendit & Stripe

Complete admin panel

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://digisellix-global-store.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d89df7d6-99da-4a7d-a449-f0e2646895ab).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
