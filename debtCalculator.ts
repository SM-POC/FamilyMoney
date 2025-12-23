
import { Debt, PayoffMonth, UserFinancialProfile, StrategyType, LentMoney } from './types';

export const calculatePayoffSchedule = (profile: UserFinancialProfile): PayoffMonth[] => {
  const { debts, income, expenses, specialEvents, luxuryBudget, savingsBuffer, strategy, lentMoney = [] } = profile;
  
  if (debts.length === 0 && lentMoney.length === 0) return [];

  const baseMonthlyIncome = income.reduce((acc, curr) => acc + curr.amount, 0);
  const recurringExpenses = expenses
    .filter(e => e.isRecurring)
    .reduce((acc, curr) => acc + curr.amount, 0);

  let currentDebts = debts.map(d => ({ ...d }));
  let currentLent = lentMoney.map(l => ({ ...l }));
  
  const clearedDebtsTracker = new Set<string>();
  const clearedLentTracker = new Set<string>();
  const schedule: PayoffMonth[] = [];
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  
  let currentMonthDate = new Date();
  let monthsCount = 0;
  const maxMonths = 360;

  while ((currentDebts.some(d => d.balance > 0) || currentLent.some(l => l.remainingBalance > 0)) && monthsCount < maxMonths) {
    const monthIndex = (currentMonthDate.getMonth() + monthsCount) % 12;
    const year = currentMonthDate.getFullYear() + Math.floor((currentMonthDate.getMonth() + monthsCount) / 12);
    
    const eventBudget = specialEvents
      .filter(e => e.month === monthIndex)
      .reduce((acc, curr) => acc + curr.budget, 0);

    const monthData: PayoffMonth = {
      monthIndex: monthsCount,
      monthName: `${monthNames[monthIndex]} ${year}`,
      startingBalance: currentDebts.reduce((acc, d) => acc + d.balance, 0),
      totalPayment: 0,
      interestPaid: 0,
      principalPaid: 0,
      remainingBalance: 0,
      debtBreakdown: [],
      lentBreakdown: [],
      savingsGoal: 0,
      eventsBudgetUsed: eventBudget,
      luxuryBudgetUsed: luxuryBudget,
      totalInterestSaved: 0, 
    };

    // Calculate income from repayments this month
    let repaymentIncome = 0;
    currentLent.forEach(l => {
      if (l.remainingBalance > 0) {
        const payment = Math.min(l.remainingBalance, l.defaultRepayment);
        repaymentIncome += payment;
        l.remainingBalance -= payment;

        const isNewlyCleared = l.remainingBalance === 0 && !clearedLentTracker.has(l.id);
        if (isNewlyCleared) clearedLentTracker.add(l.id);

        monthData.lentBreakdown.push({
          lentId: l.id,
          recipient: l.recipient,
          received: payment,
          remaining: l.remainingBalance,
          isNewlyCleared
        });
      }
    });

    let availableForDebt = baseMonthlyIncome + repaymentIncome - recurringExpenses - luxuryBudget - eventBudget;
    if (availableForDebt < 0) availableForDebt = 0;

    // 1. Mandatory Minimums
    currentDebts.forEach(debt => {
      if (debt.balance <= 0) return;

      const monthlyInterestRate = (debt.interestRate / 100) / 12;
      const interestCharge = debt.balance * monthlyInterestRate;
      
      let minPay = Math.min(debt.balance + interestCharge, debt.minimumPayment);
      const actualPayment = Math.min(minPay, availableForDebt);
      
      const principal = actualPayment - interestCharge;
      debt.balance = Math.max(0, debt.balance + interestCharge - actualPayment);
      availableForDebt -= actualPayment;

      monthData.interestPaid += interestCharge;
      monthData.principalPaid += Math.max(0, principal);
      monthData.totalPayment += actualPayment;

      const isNewlyCleared = debt.balance === 0 && !clearedDebtsTracker.has(debt.id);
      if (isNewlyCleared) clearedDebtsTracker.add(debt.id);

      monthData.debtBreakdown.push({
        debtId: debt.id,
        debtName: debt.name,
        payment: actualPayment,
        interest: interestCharge,
        remaining: debt.balance,
        penalty: 0,
        isNewlyCleared
      });
    });

    // 2. Extra Payments
    if (availableForDebt > 0) {
      let targetDebts = currentDebts.filter(d => d.balance > 0 && d.canOverpay);
      if (strategy === StrategyType.AVALANCHE) {
        targetDebts.sort((a, b) => b.interestRate - a.interestRate);
      } else {
        targetDebts.sort((a, b) => a.balance - b.balance);
      }

      for (const debt of targetDebts) {
        if (availableForDebt <= 0) break;
        const penalty = debt.overpaymentPenalty || 0;
        if (availableForDebt <= penalty) continue;

        const effectiveAvailable = availableForDebt - penalty;
        const overpayment = Math.min(debt.balance, effectiveAvailable);
        
        debt.balance -= overpayment;
        availableForDebt -= (overpayment + penalty);
        
        monthData.principalPaid += overpayment;
        monthData.totalPayment += (overpayment + penalty);
        
        const breakdown = monthData.debtBreakdown.find(b => b.debtId === debt.id);
        const isNewlyCleared = debt.balance === 0 && !clearedDebtsTracker.has(debt.id);
        if (isNewlyCleared) clearedDebtsTracker.add(debt.id);

        if (breakdown) {
          breakdown.payment += (overpayment + penalty);
          breakdown.remaining = debt.balance;
          breakdown.penalty += penalty;
          breakdown.isNewlyCleared = isNewlyCleared;
        } else {
          monthData.debtBreakdown.push({
            debtId: debt.id,
            debtName: debt.name,
            payment: overpayment + penalty,
            interest: 0,
            remaining: debt.balance,
            penalty: penalty,
            isNewlyCleared
          });
        }
      }
    }

    monthData.savingsGoal = Math.max(0, availableForDebt * (savingsBuffer / 100));
    monthData.remainingBalance = currentDebts.reduce((acc, d) => acc + d.balance, 0);

    schedule.push(monthData);
    monthsCount++;
  }

  return schedule;
};
