# 💰 ExpenseTracker - Modern Full-Stack Finance Management

ExpenseTracker is a powerful, modern full-stack application designed to help you take control of your finances. Built with TypeScript and cutting-edge technologies, it offers a beautiful, responsive interface and robust backend to track expenses, manage budgets, and visualize your financial health.

![ExpenseTracker Dashboard](https://raw.githubusercontent.com/anshujod/newexpensetracker/main/screenshots/dashboard.png)

## ✨ Features

- **📊 Real-time Dashboard**: Interactive charts and graphs showing income vs. expenses and category-wise spending
- **💳 Transaction Management**: Easy-to-use interface for adding, editing, and categorizing transactions
- **🔄 Recurring Transactions**: Set up and manage recurring expenses and income
- **📅 Budget Planning**: Create and track budgets by category with visual progress indicators
- **📱 Responsive Design**: Seamless experience across desktop, tablet, and mobile devices
- **🌓 Dark/Light Mode**: Eye-friendly theme options for any time of day

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for robust UI development
- **TailwindCSS** for modern, responsive styling
- **Chart.js** for beautiful data visualization
- **React Query** for efficient server-state management
- **Wouter** for lightweight routing

### Backend
- **Express.js** with TypeScript for type-safe API development
- **PostgreSQL** with Drizzle ORM for reliable data storage
- **Zod** for runtime type validation
- **JWT** for secure authentication

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/anshujod/newexpensetracker.git
   cd newexpensetracker
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file in root directory
   cp .env.example .env
   
   # Add your database URL and other configurations
   DATABASE_URL=your_database_url
   JWT_SECRET=your_jwt_secret
   ```

4. **Run database migrations**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   # Start backend (from root directory)
   npm run dev
   
   # Start frontend (from client directory)
   cd client
   npm run dev
   ```

## 📱 Key Features in Detail

### Smart Transaction Management
- Automatic categorization of transactions
- Bulk import/export capabilities
- Receipt image attachment support
- Search and filtering options

### Intelligent Budget Control
- Category-based budget allocation
- Real-time budget tracking
- Overspending alerts
- Monthly rollover options

### Comprehensive Reporting
- Monthly/yearly comparison charts
- Category-wise expense breakdown
- Savings rate tracking
- Export reports in multiple formats

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- HTTPS encryption
- Rate limiting
- Input validation and sanitization

## 🎯 Future Roadmap

- [ ] Multi-currency support
- [ ] Bill reminders and notifications
- [ ] Investment tracking
- [ ] Mobile app development
- [ ] AI-powered insights
- [ ] Bank account integration

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TailwindCSS](https://tailwindcss.com/) for the awesome styling utilities
- [Chart.js](https://www.chartjs.org/) for beautiful charts
- [Drizzle ORM](https://orm.drizzle.team/) for the excellent database tooling

## 📞 Support

For support, email support@expensetracker.com or open an issue in the GitHub repository.
