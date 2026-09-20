# ShopWave

ShopWave is a full-stack e-commerce platform built with vanilla HTML/CSS/JavaScript, Node.js, Express, MySQL, JWT authentication, and bcryptjs. It is designed for XAMPP/phpMyAdmin development and portfolio demonstration.

## Features

- Product search, category filtering, price filters, stock filtering, sorting, and pagination
- Product details with wishlist, reviews, ratings, and recently viewed products
- Authenticated cart with stock validation and transactional checkout
- Orders, order history, order details, and admin status management
- Wishlist remove and move-to-cart actions
- Admin product, stock, category, and order management
- MySQL schema for users, categories, products, cart, orders, order_items, wishlist_items, reviews, coupons, and payments
- Production-shaped tables for coupon usage, notifications, product galleries, saved addresses, and audit logs
- Safe student-project payments: Cash on Delivery and clearly labeled mock online payment; no card or PIN data is stored

## Stack

- Frontend: HTML5, CSS3, vanilla JavaScript
- Backend: Node.js and Express.js
- Database: MySQL through XAMPP/phpMyAdmin
- Authentication: JWT and bcryptjs
- Validation: express-validator

## Database Setup

1. Start MySQL in XAMPP, or start the installed `MySQL80` Windows service. This machine currently has standalone MySQL 8.0 installed; `C:\xampp` was not found.
2. Open phpMyAdmin.
3. Run [setup.mysql.sql](backend/db/setup.mysql.sql) to create `shopdb` if necessary.
4. Select `shopdb` and import [schema.mysql.sql](backend/db/schema.mysql.sql).
5. Import [payments.mysql.sql](backend/db/payments.mysql.sql) when payment processing is enabled.

The application also initializes the schema on startup. The database user must have permission to create and alter the tables.

The checkout payment choices are `COD` and `MOCK_ONLINE`. The online option is a demo flow only and stores provider metadata, amount, and status in `payments`; it never accepts or stores card numbers, CVV, UPI PINs, or bank credentials.

## Environment

Copy `backend/.env.example` to `backend/.env` and set the local MySQL password:

```env
PORT=8080
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=shopdb
JWT_SECRET=use-a-long-random-secret
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5500
```

Do not paste `DB_PASSWORD=...` directly into PowerShell. That syntax belongs inside the `.env` file. For a temporary PowerShell-only value, use:

```powershell
$env:DB_PASSWORD = 'your_mysql_password'
```

Never commit `.env`, database credentials, JWT secrets, or payment credentials.

The repository-level `.gitignore` excludes `backend/.env`, `node_modules/`, the bundled `node-v20/` runtime, local database artifacts, and logs. Commit `backend/.env.example` instead of local credentials.

## Run

From `backend/`:

```powershell
npm install
npm start
```

PowerShell from the project root:

```powershell
$project = 'C:\Users\SRINATH M\Downloads\CodeAlpha_Ecommerce\CodeAlpha_Ecommerce'
Set-Location "$project\backend"
& '..\..\node-v20\node-v20.20.2-win-x64\node.exe' server.js
```

If MySQL is stopped, open **PowerShell as Administrator** and run:

```powershell
Start-Service MySQL80
Get-Service MySQL80
```

Do not paste the database error text or `DB_PASSWORD=...` into PowerShell. Put the password in `backend/.env`. For a temporary PowerShell value, use `$env:DB_PASSWORD = 'your-password'`.

Open `http://localhost:8080`. Express serves the frontend and API from the same port.

Development seed accounts are created only when the database has no users:

- Admin: `admin@codealpha.dev` / `Admin@123`
- User: `user@codealpha.dev` / `User@123`

Change or remove these accounts before deployment.

## API Groups

- `/api/auth` registration, login, profile
- `/api/products` catalog, filters, pagination
- `/api/categories` category listing
- `/api/cart` authenticated cart operations
- `/api/wishlist` authenticated wishlist operations
- `/api/reviews` public summaries and verified-purchase reviews
- `/api/orders` checkout and customer orders
- `/api/admin` admin product and category management
- `/api/admin/orders` admin order management

## Project Structure

```text
backend/
  db/              MySQL pool, schema, seed scripts
  middleware/      JWT and validation middleware
  routes/          REST API modules
  utils/           serializers and error handling
frontend/
  index.html       landing and storefront home
  login.html       sign in
  register.html    account creation
  shop/            product discovery routes
  account/         dashboard and customer account routes
  checkout/        cart and checkout routes
  admin/           admin dashboard and management routes
  css/             shared, dashboard, component, and responsive styles
  js/              API, auth, navigation, UI helpers, and page scripts
  *.html           legacy flat URLs retained for compatibility
```

## Validation

The backend modules are checked with `node --check`. Full API validation requires MySQL to be running and valid credentials in `backend/.env`.

## Final project status

The app is ready to run locally with MySQL active and the expected environment values in `backend/.env`.

- Customer login: `user@codealpha.dev` / `User@123`
- Admin login: `admin@codealpha.dev` / `Admin@123`
- Local storefront: `http://localhost:8080`

Use the project root command below to start the backend when needed:

```powershell
$project = 'C:\Users\SRINATH M\Downloads\CodeAlpha_Ecommerce\CodeAlpha_Ecommerce'
Set-Location "$project\backend"
& '..\..\node-v20\node-v20.20.2-win-x64\node.exe' server.js
```
