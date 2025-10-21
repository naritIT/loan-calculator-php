import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// --- DATA TABLES ---
const PACKAGE_RECOMMENDATION = [
  { bill: '3,000-4,000', kW: 3, phase: '1 เฟส', savings: '1,500-2,000', payback: '~5 ปี' },
  { bill: '4,000-6,000', kW: 5, phase: '1/3 เฟส', savings: '2,500-3,500', payback: '~4 ปี' },
  { bill: '6,000-10,000', kW: 10, phase: '3 เฟส', savings: '5,000-6,500', payback: '~4 ปี' },
  { bill: '10,000-15,000', kW: 15, phase: '3 เฟส', savings: '7,500-9,500', payback: '~4 ปี' },
  { bill: '15,000-20,000', kW: 20, phase: '3 เฟส', savings: '10,000-12,000', payback: '~3 ปี' },
];

const PRICE_NO_BATTERY = [
  { kW: 3, phase: '1 เฟส', Huawei: 107900, Sungrow: 98900 },
  { kW: 5, phase: '1 เฟส', Huawei: 147900, Sungrow: 130900 },
  { kW: 5, phase: '3 เฟส', Huawei: 161900, Sungrow: 151900 },
  { kW: 10, phase: '3 เฟส', Huawei: 274900, Sungrow: 247900 },
  { kW: 15, phase: '3 เฟส', Huawei: 374900, Sungrow: 373900 },
  { kW: 20, phase: '3 เฟส', Huawei: 466900, Sungrow: 437800 },
];

const PRICE_WITH_BATTERY = [
  { kW: 3, phase: '1 เฟส', Huawei: 277100, Sungrow: 255100 },
  { kW: 5, phase: '1 เฟส', Huawei: 294900, Sungrow: 353100 },
  { kW: 5, phase: '3 เฟส', Huawei: 302200, Sungrow: 353100 },
  { kW: 10, phase: '3 เฟส', Huawei: 392200, Sungrow: 463700 },
  { kW: 15, phase: '3 เฟส', Huawei: 568900, Sungrow: null },
  { kW: 20, phase: '3 เฟส', Huawei: 738600, Sungrow: null },
];

const WARRANTIES = [
    'แผงโซลาร์เซลล์ รับประกันประสิทธิภาพ 30 ปี',
    'แผงโซลาร์เซลล์ รับประกันอุปกรณ์ 12 ปี',
    'อินเวอร์เตอร์ รับประกัน 10 ปี',
    'บริการล้างแผงฟรี 2 ครั้ง/ปี ตลอด 2 ปีแรก',
    'รับประกันการติดตั้ง 2 ปีเต็ม',
    'ทีมงานวิศวกรเข้าตรวจสอบระบบทุกปี',
    'ประกันอัคคีภัย ฟรี 1 ปี',
    'บริการช่วยเหลือและให้คำปรึกษาตลอดอายุการใช้งาน'
];

interface FullPackageDetails {
    brand: 'Huawei' | 'Sungrow';
    price: number;
    kW: number;
    phase: string;
    hasBattery: boolean;
}

// --- APP STATE INTERFACE ---
interface UserData {
    name: string;
    houseType: string;
    phase: '1 เฟส' | '3 เฟส' | '';
    billRange: string;
    usagePattern: 'กลางวันมากกว่า' | 'กลางคืนมากกว่า' | '';
    hasCreditCard: 'Yes' | 'No' | '';
    income: string;
    incomeSource: 'เงินเดือนประจำ' | 'ธุรกิจส่วนตัว' | 'อาชีพอิสระ' | '';
    jobTitle: string;
    workplace: string;
    yearsOfService: string;
    monthsOfService: string;
    loanTerm: number;
    phoneNumber: string;
}

interface SelectedPackage {
    brand: 'Huawei' | 'Sungrow';
    price: number;
}

interface AmortizationData {
    month: number;
    principalPaid: number;
    interestPaid: number;
    remainingBalance: number;
    cumulativePrincipalPaid: number;
    cumulativeInterestPaid: number;
}

const stepLabels = ['ข้อมูลลูกค้า', 'เลือกแพคเกจ', 'คำนวณสินเชื่อ', 'ตรวจสอบวงเงิน', 'สรุปผล'];

const ProgressIndicator = ({ currentStep, labels }: { currentStep: number; labels: string[] }) => {
    return (
        <div className="progress-indicator">
            {labels.map((label, index) => {
                const stepNumber = index + 1;
                const isActive = currentStep === stepNumber;
                const isCompleted = currentStep > stepNumber;

                return (
                    <React.Fragment key={label}>
                        <div className={`progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                            <div className="step-number">{isCompleted ? '✓' : stepNumber}</div>
                            <div className="step-label">{label}</div>
                        </div>
                        {index < labels.length - 1 && (
                            <div className={`progress-connector ${isCompleted ? 'completed' : ''}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};


const App = () => {
  const [step, setStep] = useState(0); // 0: Welcome, 1: Data, 2: PkgSelect, 3: Loan, 4: Eligibility, 5: Summary, 6: Finish
  const [userData, setUserData] = useState<UserData>({
    name: '', houseType: 'บ้านเดี่ยว', phase: '', billRange: '', usagePattern: '', hasCreditCard: '',
    income: '', incomeSource: '', jobTitle: '', workplace: '', yearsOfService: '', monthsOfService: '', loanTerm: 12, phoneNumber: '',
  });
  const [selectedPackage, setSelectedPackage] = useState<SelectedPackage | null>(null);
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);
  const [incomeError, setIncomeError] = useState<string>('');
  const [maxLoanAmount, setMaxLoanAmount] = useState<number | null>(null);
  const [amortizationSchedule, setAmortizationSchedule] = useState<AmortizationData[] | null>(null);

  const handleDataCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePackageSelect = (brand: 'Huawei' | 'Sungrow', price: number) => {
    setSelectedPackage({ brand, price });
    setStep(3);
  };
  
  const handleLoanCalcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(4);
  };
  
  const handleCreditCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPackage) {
        setMonthlyPayment(Math.round(selectedPackage.price / 10));
        setUserData({ ...userData, loanTerm: 10 });
        setAmortizationSchedule(null);
        setStep(5);
    }
  };

  const handleFinalPackageSelection = (pkg: FullPackageDetails) => {
    setSelectedPackage({brand: pkg.brand, price: pkg.price});
    const principal = pkg.price;
    const annualInterestRate = 0.165; // 16.5% per year
    const termInMonths = userData.loanTerm;

    if (principal > 0 && termInMonths > 0) {
        const monthlyRate = annualInterestRate / 12;
        const monthlyPaymentCalc = principal * (monthlyRate * Math.pow(1 + monthlyRate, termInMonths)) / (Math.pow(1 + monthlyRate, termInMonths) - 1);
        setMonthlyPayment(Math.round(monthlyPaymentCalc));

        const schedule: AmortizationData[] = [];
        let remainingBalance = principal;
        let cumulativePrincipal = 0;
        let cumulativeInterest = 0;
        for (let i = 1; i <= termInMonths; i++) {
            const interestPaid = remainingBalance * monthlyRate;
            const principalPaid = monthlyPaymentCalc - interestPaid;
            remainingBalance -= principalPaid;
            cumulativePrincipal += principalPaid;
            cumulativeInterest += interestPaid;
            
            schedule.push({
                month: i,
                principalPaid,
                interestPaid,
                remainingBalance: remainingBalance < 0 ? 0 : remainingBalance,
                cumulativePrincipalPaid: cumulativePrincipal,
                cumulativeInterestPaid: cumulativeInterest
            });
        }
        setAmortizationSchedule(schedule);

    } else {
        setMonthlyPayment(0);
        setAmortizationSchedule(null);
    }
    setStep(5);
  };

  const handleContactRequest = (e: React.FormEvent) => {
      e.preventDefault();
      setStep(6);
  }

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const income = Number(value);
    setUserData({ ...userData, income: value });
    setIncomeError('');
    setMaxLoanAmount(null);

    if (value === '') return;
    if (income <= 0) {
        setIncomeError('รายได้ต้องเป็นตัวเลขที่มากกว่า 0');
        return;
    }
    const limit = income > 30000 ? income * 5 : income * 1.5;
    setMaxLoanAmount(limit);
  };

  const handleReset = () => {
    setStep(0);
    setUserData({
      name: '', houseType: 'บ้านเดี่ยว', phase: '', billRange: '', usagePattern: '', hasCreditCard: '',
      income: '', incomeSource: '', jobTitle: '', workplace: '', yearsOfService: '', monthsOfService: '', loanTerm: 12, phoneNumber: '',
    });
    setSelectedPackage(null);
    setMonthlyPayment(null);
    setIncomeError('');
    setMaxLoanAmount(null);
    setAmortizationSchedule(null);
  };

  const recommendation = useMemo(() => {
    if (!userData.billRange) return null;
    return PACKAGE_RECOMMENDATION.find(p => p.bill === userData.billRange) || null;
  }, [userData.billRange]);

  const pricingOptions = useMemo(() => {
    if (!recommendation || !userData.usagePattern) return null;
    const priceTable = userData.usagePattern === 'กลางวันมากกว่า' ? PRICE_NO_BATTERY : PRICE_WITH_BATTERY;
    return priceTable.find(p => {
        if (recommendation.kW === 5) {
            return p.kW === recommendation.kW && p.phase.includes(userData.phase);
        }
        return p.kW === recommendation.kW;
    }) || null;
  }, [recommendation, userData.usagePattern, userData.phase]);
  
  const allPackages = useMemo<FullPackageDetails[]>(() => {
    const combined = [
        ...PRICE_NO_BATTERY.map(p => ({...p, hasBattery: false})),
        ...PRICE_WITH_BATTERY.map(p => ({...p, hasBattery: true}))
    ];
    const flattened: FullPackageDetails[] = [];
    combined.forEach(pkg => {
        if (pkg.Huawei) {
            flattened.push({ brand: 'Huawei', price: pkg.Huawei, kW: pkg.kW, phase: pkg.phase, hasBattery: pkg.hasBattery });
        }
        if (pkg.Sungrow) {
            flattened.push({ brand: 'Sungrow', price: pkg.Sungrow, kW: pkg.kW, phase: pkg.phase, hasBattery: pkg.hasBattery });
        }
    });
    return flattened.sort((a,b) => a.price - b.price);
  }, []);

  const renderStep = () => {
    const isAnyPackageEligible = maxLoanAmount === null ? true : allPackages.some(pkg => maxLoanAmount >= pkg.price);

    switch (step) {
      case 0: // Welcome Screen
        return (
          <div className="step-content final-message">
            <p style={{marginBottom: "2rem"}}>สวัสดีครับ! เราจะช่วยคุณประเมเมินแพคเกจโซลาร์และสินเชื่อสำหรับบ้านคุณ</p>
            <button className="btn" onClick={() => setStep(1)}>เริ่มต้นประเมิน</button>
          </div>
        );
      case 1: // Data Collection
        return (
          <div className="step-content">
            <form onSubmit={handleDataCollectionSubmit}>
              <div className="form-group">
                <label htmlFor="name">ชื่อ-นามสกุล</label>
                <input type="text" id="name" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label htmlFor="houseType">ลักษณะบ้าน</label>
                <select id="houseType" value={userData.houseType} onChange={e => setUserData({...userData, houseType: e.target.value})} required>
                  <option>บ้านเดี่ยว</option>
                  <option>บ้านแฝด</option>
                  <option>ทาวน์เฮ้าส์</option>
                  <option>อื่นๆ</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="phase">ระบบไฟ</label>
                <select id="phase" value={userData.phase} onChange={e => setUserData({...userData, phase: e.target.value as UserData['phase']})} required>
                  <option value="" disabled>-- เลือกระบบไฟ --</option>
                  <option>1 เฟส</option>
                  <option>3 เฟส</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="billRange">ค่าไฟต่อเดือน (บาท)</label>
                <select id="billRange" value={userData.billRange} onChange={e => setUserData({...userData, billRange: e.target.value})} required>
                    <option value="" disabled>-- เลือกช่วงค่าไฟ --</option>
                    {PACKAGE_RECOMMENDATION.map(p => <option key={p.bill} value={p.bill}>{p.bill}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="usagePattern">การใช้ไฟส่วนใหญ่</label>
                <select id="usagePattern" value={userData.usagePattern} onChange={e => setUserData({...userData, usagePattern: e.target.value as UserData['usagePattern']})} required>
                    <option value="" disabled>-- เลือกการใช้ไฟ --</option>
                    <option>กลางวันมากกว่า</option>
                    <option>กลางคืนมากกว่า</option>
                </select>
              </div>
              <button type="submit" className="btn">ขั้นตอนถัดไป</button>
            </form>
          </div>
        );
      case 2: // Package Summary & Selection
        if (!recommendation || !pricingOptions) return <p>กำลังโหลดข้อมูล...</p>;
        return (
            <div className="step-content">
                <div className="summary-card">
                    <h2>สรุปแพคเกจที่แนะนำสำหรับคุณ</h2>
                    <p><strong>ขนาดที่แนะนำ:</strong> {recommendation.kW} kW ({userData.phase})</p>
                    <p><strong>ประหยัดค่าไฟ:</strong> {recommendation.savings} บาท/เดือน</p>
                    <p><strong>ระยะเวลาคืนทุน:</strong> {recommendation.payback}</p>
                </div>
                <h3>✅ การรับประกันจากเรา</h3>
                <ul className="warranty-list">
                    {WARRANTIES.map(w => <li key={w}>{w}</li>)}
                </ul>
                <div className="package-options">
                    <h3>เลือกแพคเกจของคุณ</h3>
                    <div className="package-cards-container">
                        {pricingOptions.Huawei && (
                            <div className="package-card">
                                <h4>Huawei</h4>
                                <p className="price">{pricingOptions.Huawei?.toLocaleString()} บาท*</p>
                                {userData.usagePattern === 'กลางคืนมากกว่า' && <p className="battery-note">ราคารวมแบตเตอรี่</p>}
                                <button className="btn btn-select" onClick={() => handlePackageSelect('Huawei', pricingOptions.Huawei!)}>
                                    เลือกแพคเกจนี้
                                </button>
                            </div>
                        )}
                        {pricingOptions.Sungrow && (
                             <div className="package-card">
                                <h4>Sungrow</h4>
                                <p className="price">{pricingOptions.Sungrow?.toLocaleString()} บาท*</p>
                                {userData.usagePattern === 'กลางคืนมากกว่า' && <p className="battery-note">ราคารวมแบตเตอรี่</p>}
                                <button className="btn btn-select" onClick={() => handlePackageSelect('Sungrow', pricingOptions.Sungrow!)}>
                                    เลือกแพคเกจนี้
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="vat-note">*ราคารวมภาษีมูลค่าเพิ่ม (VAT) แล้ว</p>
                </div>
            </div>
        )
      case 3: // Loan Calculation
        return (
            <div className="step-content">
                 <h2>คำนวณสินเชื่อ</h2>
                 <p>คุณเลือกแพคเกจ {selectedPackage?.brand} ราคา {selectedPackage?.price.toLocaleString()} บาท*</p>

                 <div className="form-group" style={{marginTop: "1.5rem"}}>
                    <label htmlFor="hasCreditCard">คุณมีบัตรเครดิตที่ร่วมรายการผ่อน 0% หรือไม่?</label>
                    <select
                        id="hasCreditCard"
                        value={userData.hasCreditCard}
                        onChange={e => setUserData({ ...userData, hasCreditCard: e.target.value as UserData['hasCreditCard'] })}
                        required
                    >
                        <option value="" disabled>-- กรุณาเลือก --</option>
                        <option value="Yes">มี</option>
                        <option value="No">ไม่มี</option>
                    </select>
                </div>

                {userData.hasCreditCard === 'Yes' && selectedPackage && (
                    <div className="credit-card-option">
                        <h3>ข้อเสนอพิเศษ! ผ่อน 0% นาน 10 เดือน</h3>
                        <div className="info-box">
                            <p style={{fontSize: '1.1rem'}}>ค่างวดต่อเดือน: <strong>{(selectedPackage.price / 10).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})} บาท</strong></p>
                        </div>
                        <form onSubmit={handleCreditCardSubmit} style={{marginTop: '1.5rem'}}>
                            <button type="submit" className="btn">ยืนยันและไปที่หน้าสรุปผล</button>
                        </form>
                    </div>
                )}

                {userData.hasCreditCard === 'No' && (
                    <form onSubmit={handleLoanCalcSubmit} style={{marginTop: "1.5rem"}}>
                        <p style={{marginBottom: '1.5rem', textAlign: 'center'}}>กรุณากรอกข้อมูลเพื่อขอสินเชื่อส่วนบุคคล (ผ่อนชำระนานสูงสุด 72 เดือน)</p>
                        <div className="form-group">
                            <label htmlFor="incomeSource">แหล่งที่มาของรายได้</label>
                            <select
                                id="incomeSource"
                                value={userData.incomeSource}
                                onChange={e => setUserData({ ...userData, incomeSource: e.target.value as UserData['incomeSource'] })}
                                required
                            >
                                <option value="" disabled>-- เลือกแหล่งที่มา --</option>
                                <option>เงินเดือนประจำ</option>
                                <option>ธุรกิจส่วนตัว</option>
                                <option>อาชีพอิสระ</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="jobTitle">ตำแหน่งงาน</label>
                            <input
                                type="text"
                                id="jobTitle"
                                value={userData.jobTitle}
                                onChange={e => setUserData({ ...userData, jobTitle: e.target.value })}
                                placeholder="เช่น ผู้จัดการ"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="workplace">สถานที่ทำงาน</label>
                            <input
                                type="text"
                                id="workplace"
                                value={userData.workplace}
                                onChange={e => setUserData({ ...userData, workplace: e.target.value })}
                                placeholder="เช่น บริษัท สแกนเอิร์ธ เพาเวอร์ จำกัด"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>อายุงาน</label>
                            <div className="multi-input-group">
                                <div className="input-with-label">
                                    <input
                                        type="number"
                                        id="yearsOfService"
                                        value={userData.yearsOfService}
                                        onChange={e => setUserData({ ...userData, yearsOfService: e.target.value })}
                                        placeholder="เช่น 5"
                                        required
                                        min="0"
                                    />
                                    <label htmlFor="yearsOfService">ปี</label>
                                </div>
                                <div className="input-with-label">
                                    <input
                                        type="number"
                                        id="monthsOfService"
                                        value={userData.monthsOfService}
                                        onChange={e => setUserData({ ...userData, monthsOfService: e.target.value })}
                                        placeholder="เช่น 6"
                                        required
                                        min="0"
                                        max="11"
                                    />
                                    <label htmlFor="monthsOfService">เดือน</label>
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="income">รายได้ต่อเดือน (บาท)</label>
                            <input type="number" id="income" value={userData.income} onChange={handleIncomeChange} placeholder="เช่น 50000" required />
                            {incomeError && <p className="error-message">{incomeError}</p>}
                        </div>

                        {maxLoanAmount !== null && (
                            <div className="info-box">
                                <p>วงเงินกู้สูงสุดโดยประมาณ: <strong>{maxLoanAmount.toLocaleString()} บาท</strong></p>
                            </div>
                        )}
                        <div className="form-group" style={{marginTop: "1.5rem"}}>
                            <label htmlFor="loanTerm">เลือกระยะเวลาผ่อนชำระ</label>
                            <div className="slider-container">
                                <input
                                    type="range"
                                    id="loanTerm"
                                    min="12"
                                    max="72"
                                    step="1"
                                    value={userData.loanTerm}
                                    onChange={e => setUserData({ ...userData, loanTerm: Number(e.target.value) })}
                                    className="loan-slider"
                                />
                                <div className="slider-value">{userData.loanTerm} เดือน</div>
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="btn"
                            disabled={
                                !userData.loanTerm ||
                                !!incomeError ||
                                !userData.income ||
                                !userData.incomeSource ||
                                !userData.jobTitle ||
                                !userData.workplace ||
                                !userData.yearsOfService ||
                                !userData.monthsOfService
                            }
                        >
                            ตรวจสอบวงเงิน
                        </button>
                    </form>
                )}
                 <p className="vat-note">*ราคารวมภาษีมูลค่าเพิ่ม (VAT) แล้ว</p>
            </div>
        );
    case 4: // Package Eligibility Check
        if (!selectedPackage || maxLoanAmount === null) return <p>กำลังคำนวณวงเงิน...</p>;

        if (!isAnyPackageEligible) {
            return (
                <div className="step-content">
                    <h2>ตรวจสอบวงเงิน</h2>
                    <div className="info-box" style={{textAlign: 'center', marginBottom: '2rem'}}>
                        <p>วงเงินกู้สูงสุดของคุณคือ: <strong>{maxLoanAmount.toLocaleString()} บาท</strong></p>
                    </div>
                    
                    <div className="contact-fallback-section">
                        <h3>วงเงินไม่เพียงพอสำหรับทุกแพคเกจ</h3>
                        <p>
                            ขออภัยครับ จากข้อมูลรายได้เบื้องต้น วงเงินสินเชื่อของคุณอาจไม่ครอบคลุมแพคเกจโซลาร์ของเราในขณะนี้
                            <br />
                            อย่างไรก็ตาม เราอาจมีทางเลือกหรือโปรโมชันอื่นๆ ที่เหมาะสมกับคุณ
                        </p>
                        <button className="btn" onClick={() => setStep(5)}>
                            ต่อไป
                        </button>
                    </div>
                </div>
            );
        }
        
        const originalPackageDetails = allPackages.find(p => p.brand === selectedPackage.brand && p.price === selectedPackage.price);
        const isOriginalEligible = originalPackageDetails ? maxLoanAmount >= originalPackageDetails.price : false;

        let recommendedPackages: FullPackageDetails[] = [];
        if (!isOriginalEligible) {
            recommendedPackages = allPackages.filter(p => {
                const isAffordable = p.price <= maxLoanAmount;
                const isNotOriginal = p.brand !== selectedPackage.brand || p.price !== selectedPackage.price;
                const matchesPhase = p.phase.includes(userData.phase);
                return isAffordable && isNotOriginal && matchesPhase;
            }).slice(0, 3);
        }


        return (
            <div className="step-content">
                <h2>ตรวจสอบวงเงินกับแพคเกจ</h2>
                <div className="info-box" style={{textAlign: 'center', marginBottom: '2rem'}}>
                    <p>วงเงินกู้สูงสุดของคุณคือ: <strong>{maxLoanAmount.toLocaleString()} บาท</strong></p>
                </div>
                
                <div className="your-choice-section">
                    <h3>แพคเกจที่คุณเลือก</h3>
                    {originalPackageDetails && (
                        <div className={`package-card ${isOriginalEligible ? 'eligible' : 'ineligible'}`}>
                             <h4>{originalPackageDetails.brand} {originalPackageDetails.kW}kW ({originalPackageDetails.phase}) {originalPackageDetails.hasBattery ? '+แบต' : ''}</h4>
                             <p className="price">{originalPackageDetails.price.toLocaleString()} บาท*</p>
                             {originalPackageDetails.hasBattery && <p className="battery-note">ราคารวมแบตเตอรี่</p>}
                             {!isOriginalEligible && <p className="ineligible-text">วงเงินไม่เพียงพอ กรุณาเลือกแพคเกจอื่น</p>}
                             <button className="btn btn-select" disabled={!isOriginalEligible} onClick={() => handleFinalPackageSelection(originalPackageDetails)}>
                                 เลือกและคำนวณค่างวด
                             </button>
                        </div>
                    )}
                </div>

                {!isOriginalEligible && recommendedPackages.length > 0 && (
                     <div className="other-options-section">
                        <h3>แพคเกจอื่นๆ ที่น่าสนใจ (วงเงินของคุณครอบคลุม)</h3>
                         <div className="package-cards-container-grid">
                            {recommendedPackages.map((pkg) => {
                                 return (
                                    <div key={`${pkg.brand}-${pkg.price}-${pkg.phase}-${pkg.hasBattery}`} className="package-card eligible">
                                        <h4>{pkg.brand} {pkg.kW}kW ({pkg.phase}) {pkg.hasBattery ? '+แบต' : ''}</h4>
                                        <p className="price">{pkg.price.toLocaleString()} บาท*</p>
                                        {pkg.hasBattery && <p className="battery-note">ราคารวมแบตเตอรี่</p>}
                                        <button className="btn btn-select" onClick={() => handleFinalPackageSelection(pkg)}>
                                            เลือกและคำนวณค่างวด
                                        </button>
                                    </div>
                                 )
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
      case 5: // Final Result & Options
        if (userData.hasCreditCard === 'Yes' && selectedPackage && monthlyPayment !== null) {
            return (
                 <div className="step-content">
                    <h2>สรุปแผนการผ่อนชำระ</h2>
                    <div className="customer-summary-card">
                        <h4>ข้อมูลลูกค้า</h4>
                         <div className="summary-detail-row">
                            <span>ชื่อ-นามสกุล</span>
                            <span>{userData.name}</span>
                        </div>
                         <div className="summary-detail-row">
                            <span>ลักษณะบ้าน</span>
                            <span>{userData.houseType}</span>
                        </div>
                    </div>
                     <div className="loan-summary-card">
                        <h4>สรุปข้อมูลการผ่อนชำระ</h4>
                        <div className="summary-detail-row">
                            <span>ยอดผ่อนชำระ (แพคเกจ {selectedPackage.brand})*</span>
                            <span>{selectedPackage.price.toLocaleString()} บาท</span>
                        </div>
                        <div className="summary-detail-row">
                            <span>โปรโมชัน</span>
                            <span>ผ่อน 0% ผ่านบัตรเครดิต</span>
                        </div>
                         <div className="summary-detail-row">
                            <span>ระยะเวลาผ่อนชำระ</span>
                            <span>10 เดือน</span>
                        </div>
                        <div className="summary-detail-row total monthly-payment">
                            <span>ค่างวดต่อเดือน</span>
                            <span>{monthlyPayment.toLocaleString()} บาท</span>
                        </div>
                         <p className="vat-note" style={{marginTop: '1rem', textAlign: 'left', paddingLeft: '0.5rem', color: '#34495e'}}>*ราคารวมภาษีมูลค่าเพิ่ม (VAT) แล้ว</p>
                    </div>

                    <div className="final-options">
                        <p style={{textAlign: 'center', marginBottom: '1.5rem', fontWeight: '500'}}>คุณต้องการดำเนินการต่ออย่างไร?</p>
                        <button className="btn" onClick={() => setStep(6)}>A. จบการประเมิน</button>
                        <form onSubmit={handleContactRequest}>
                            <div className="form-group" style={{marginTop: "1.5rem"}}>
                                <label htmlFor="phone">B. ต้องการให้เจ้าหน้าที่ติดต่อกลับ? กรุณากรอกเบอร์โทรศัพท์</label>
                                <input type="tel" id="phone" value={userData.phoneNumber} onChange={e => setUserData({...userData, phoneNumber: e.target.value})} placeholder="08xxxxxxxx" required />
                            </div>
                            <button type="submit" className="btn btn-secondary">ส่งข้อมูลติดต่อ</button>
                        </form>
                    </div>
                </div>
            );
        }
      
        if (userData.hasCreditCard === 'No' && !isAnyPackageEligible) {
            return (
                <div className="step-content">
                    <h2>ปรึกษาเจ้าหน้าที่เพิ่มเติม</h2>
                    <div className="customer-summary-card">
                        <h4>ข้อมูลลูกค้า</h4>
                        <div className="summary-detail-row">
                            <span>ชื่อ-นามสกุล</span>
                            <span>{userData.name}</span>
                        </div>
                        <div className="summary-detail-row">
                            <span>รายได้ต่อเดือน</span>
                            <span>{Number(userData.income).toLocaleString()} บาท</span>
                        </div>
                    </div>

                    <div className="explanation-card" style={{borderColor: 'var(--error-color)', backgroundColor: '#fdf2f2'}}>
                        <h4><span style={{color: 'var(--error-color)'}}>!</span> วงเงินไม่เพียงพอสำหรับทุกแพคเกจ</h4>
                        <p>
                            จากข้อมูลเบื้องต้น วงเงินสินเชื่อของคุณ (ประมาณ {maxLoanAmount?.toLocaleString()} บาท) อาจไม่ครอบคลุมแพคเกจโซลาร์ของเราในขณะนี้
                            อย่างไรก็ตาม เราอาจมีทางเลือกหรือโปรโมชันอื่นๆ ที่เหมาะสมกับคุณ กรุณาทิ้งข้อมูลติดต่อเพื่อให้เจ้าหน้าที่ให้คำแนะนำเพิ่มเติม
                        </p>
                    </div>

                    <div className="final-options">
                        <p style={{textAlign: 'center', marginBottom: '1.5rem', fontWeight: '500'}}>คุณต้องการดำเนินการต่ออย่างไร?</p>
                        <button className="btn" onClick={() => setStep(6)}>A. จบการประเมิน</button>
                        <form onSubmit={handleContactRequest}>
                            <div className="form-group" style={{marginTop: "1.5rem"}}>
                                <label htmlFor="phone">B. ต้องการให้เจ้าหน้าที่ติดต่อกลับ? กรุณากรอกเบอร์โทรศัพท์</label>
                                <input type="tel" id="phone" value={userData.phoneNumber} onChange={e => setUserData({...userData, phoneNumber: e.target.value})} placeholder="08xxxxxxxx" required />
                            </div>
                            <button type="submit" className="btn btn-secondary">ส่งข้อมูลติดต่อ</button>
                        </form>
                    </div>
                </div>
            );
        }

        if (!selectedPackage || !userData.loanTerm || monthlyPayment === null) {
            return <p>กำลังโหลดข้อมูล...</p>;
        }

        return (
            <div className="step-content">
                <h2>ผลการคำนวณสินเชื่อ</h2>
                
                <div className="customer-summary-card">
                    <h4>ข้อมูลลูกค้า</h4>
                    <div className="summary-detail-row">
                        <span>ชื่อ-นามสกุล</span>
                        <span>{userData.name}</span>
                    </div>
                     <div className="summary-detail-row">
                        <span>ลักษณะบ้าน</span>
                        <span>{userData.houseType}</span>
                    </div>
                    <div className="summary-detail-row">
                        <span>ระบบไฟ</span>
                        <span>{userData.phase}</span>
                    </div>
                </div>

                <div className="loan-summary-card">
                    <h4>สรุปข้อมูลสินเชื่อ</h4>
                    <div className="summary-detail-row">
                        <span>ยอดจัดสินเชื่อ (แพคเกจ {selectedPackage.brand})*</span>
                        <span>{selectedPackage.price.toLocaleString()} บาท</span>
                    </div>
                    <div className="summary-detail-row">
                        <span>อัตราดอกเบี้ย</span>
                        <span>16.5% ต่อปี (ลดต้นลดดอก)</span>
                    </div>
                     <div className="summary-detail-row">
                        <span>ระยะเวลาผ่อนชำระ</span>
                        <span>{userData.loanTerm} เดือน</span>
                    </div>
                    <div className="summary-detail-row total monthly-payment">
                        <span>ค่างวดต่อเดือน (โดยประมาณ)</span>
                        <span>{monthlyPayment?.toLocaleString()} บาท</span>
                    </div>
                    <p className="vat-note" style={{marginTop: '1rem', textAlign: 'left', paddingLeft: '0.5rem', color: '#34495e'}}>*ราคารวมภาษีมูลค่าเพิ่ม (VAT) แล้ว</p>
                </div>
                
                {amortizationSchedule && (
                    <>
                        <h3 style={{ marginTop: '2.5rem', marginBottom: '1rem', textAlign: 'left' }}>ตารางการผ่อนชำระ (โดยประมาณ)</h3>
                         <div className="amortization-table-container">
                            <table className="amortization-table">
                                <thead>
                                    <tr>
                                        <th>งวดที่</th>
                                        <th>ค่างวด</th>
                                        <th>ชำระเงินต้น</th>
                                        <th className="progress-col">เงินต้นลดลงสะสม</th>
                                        <th className="progress-col">ยอดคงเหลือ</th>
                                        <th className="interest-col">ดอกเบี้ย</th>
                                        <th className="interest-col">ดอกเบี้ยสะสม</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {amortizationSchedule.map(item => (
                                        <tr key={item.month}>
                                            <td>{item.month}</td>
                                            <td>{monthlyPayment.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                            <td>{item.principalPaid.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                            <td className="progress-col">{item.cumulativePrincipalPaid.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                            <td className="progress-col">{item.remainingBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                            <td className="interest-col">{item.interestPaid.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                            <td className="interest-col">{item.cumulativeInterestPaid.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}


                <div className="final-options">
                    <p style={{textAlign: 'center', marginBottom: '1.5rem', fontWeight: '500'}}>คุณต้องการดำเนินการต่ออย่างไร?</p>
                    <button className="btn" onClick={() => setStep(6)}>A. จบการประเมิน</button>
                    <form onSubmit={handleContactRequest}>
                        <div className="form-group" style={{marginTop: "1.5rem"}}>
                            <label htmlFor="phone">B. ต้องการให้เจ้าหน้าที่ติดต่อกลับ? กรุณากรอกเบอร์โทรศัพท์</label>
                            <input type="tel" id="phone" value={userData.phoneNumber} onChange={e => setUserData({...userData, phoneNumber: e.target.value})} placeholder="08xxxxxxxx" required />
                        </div>
                        <button type="submit" className="btn btn-secondary">ส่งข้อมูลติดต่อ</button>
                    </form>
                </div>
            </div>
        )
      case 6: // Thank you
        return (
             <div className="step-content final-message">
                <h2>การประเมินเสร็จสิ้น</h2>
                <p>{userData.phoneNumber ? "ขอบคุณสำหรับข้อมูลครับ เจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุด" : "ขอบคุณที่ใช้บริการ Scan Earth Power ครับ"}</p>
                <button className="btn" onClick={handleReset} style={{marginTop: '1.5rem'}}>
                    ประเมินอีกครั้ง
                </button>
             </div>
        )
      default:
        return <p>เกิดข้อผิดพลาด</p>;
    }
  };

  const currentStepLabel = userData.hasCreditCard === 'Yes' ? stepLabels.filter(label => label !== 'ตรวจสอบวงเงิน') : stepLabels;
  const currentStepNumber = userData.hasCreditCard === 'Yes' && step > 3 ? step - 1 : step;


  return (
    <div className="app-container">
      <header className="header">
        <h1>Scan Earth Power</h1>
        {step > 0 && step < 6 && (
           <ProgressIndicator currentStep={currentStepNumber} labels={currentStepLabel} />
        )}
      </header>
      {renderStep()}
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);