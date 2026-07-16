import React from 'react';
import { Card, Button } from './UI';
import { Printer, X } from 'lucide-react';

interface ThermalPrinterProps {
  isOpen: boolean;
  onClose: () => void;
  tokenData: {
    tokenId: string;
    type: 'opd' | 'bill' | 'lab';
    patientName: string;
    detail?: string;
    timestamp: string | Date;
  } | null;
}

export const ThermalPrinter: React.FC<ThermalPrinterProps> = ({ isOpen, onClose, tokenData }) => {
  if (!isOpen || !tokenData) return null;

  const handlePrint = () => {
    // Open a new print window to print just the thermal receipt
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const dateStr = new Date(tokenData.timestamp).toLocaleString();
      const typeLabel =
        tokenData.type === 'opd'
          ? 'OPD QUEUE TICKET'
          : tokenData.type === 'bill'
          ? 'BILL DEPOSIT SLIP'
          : 'LABORATORY ORDER';

      printWindow.document.write(`
        <html>
          <head>
            <title>Print Receipt</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body {
                font-family: 'Courier New', Courier, monospace;
                width: 72mm;
                margin: 0 auto;
                padding: 10px;
                background-color: white;
                color: black;
                font-size: 12px;
                line-height: 1.2;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .header { font-size: 16px; margin-bottom: 5px; }
              .subheader { font-size: 10px; margin-bottom: 10px; }
              .dashed-line { border-bottom: 1px dashed black; margin: 8px 0; }
              .token-id { font-size: 20px; font-weight: bold; margin: 10px 0; }
              .detail-row { display: flex; justify-content: space-between; margin: 4px 0; }
              .barcode {
                height: 40px;
                background: dashed;
                border-left: 5px solid black;
                border-right: 5px solid black;
                margin: 15px auto;
                width: 80%;
                display: flex;
                align-items: center;
                justify-content: center;
                letter-spacing: 3px;
                font-size: 10px;
              }
              .footer { font-size: 9px; margin-top: 15px; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="center bold header">LIFEFLOW CLINIC</div>
            <div class="center subheader">123 Health Ave, EMR City<br>Tel: +91 98765 43210</div>
            <div class="dashed-line"></div>
            <div class="center bold" style="font-size: 11px;">${typeLabel}</div>
            <div class="dashed-line"></div>
            <div class="center token-id">${tokenData.tokenId}</div>
            
            <div class="detail-row">
              <span>Patient:</span>
              <span class="bold">${tokenData.patientName}</span>
            </div>
            <div class="detail-row">
              <span>Date:</span>
              <span>${dateStr.split(',')[0]}</span>
            </div>
            <div class="detail-row">
              <span>Time:</span>
              <span>${dateStr.split(',')[1]?.trim() || ''}</span>
            </div>
            <div class="dashed-line"></div>
            
            <div class="bold" style="margin-top: 5px; font-size: 11px;">REPRESENTING DETAIL:</div>
            <div style="margin-top: 2px; word-break: break-all;">${tokenData.detail || 'General Consultation'}</div>
            
            <div class="barcode">
              ||| |||| | | |||| |
            </div>
            <div class="center bold" style="font-size: 9px;">${tokenData.tokenId}</div>
            
            <div class="dashed-line"></div>
            <div class="center footer bold">
              Thank you for choosing LifeFlow.<br>
              Please wait for your token to be called.
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const typeLabel =
    tokenData.type === 'opd'
      ? 'OPD Queue Ticket'
      : tokenData.type === 'bill'
      ? 'Bill Deposit Slip'
      : 'Laboratory Order';

  const dateStr = new Date(tokenData.timestamp).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-sm bg-white dark:bg-slate-900 text-slate-900 border border-slate-200 shadow-xl overflow-hidden p-0 relative rounded-2xl">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Printer className="h-4 w-4" /> Thermal Print Ticket
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Paper Container Mockup */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950 flex justify-center">
          <div className="w-[72mm] bg-white border border-slate-300 shadow-inner p-4 text-black text-xs font-mono select-none leading-normal">
            <div className="text-center font-extrabold text-sm tracking-tight mb-0.5">LIFEFLOW CLINIC</div>
            <div className="text-center text-[9px] text-slate-500 font-bold leading-tight mb-2">
              123 Health Ave, EMR City<br />Tel: +91 98765 43210
            </div>
            
            <div className="border-b border-dashed border-slate-400 my-2"></div>
            <div className="text-center font-bold text-[10px] uppercase tracking-wider">{typeLabel}</div>
            <div className="border-b border-dashed border-slate-400 my-2"></div>
            
            <div className="text-center font-extrabold text-xl py-2 text-brand-600 tracking-wider">
              {tokenData.tokenId}
            </div>
            
            <div className="space-y-1 my-2">
              <div className="flex justify-between">
                <span>Patient:</span>
                <span className="font-bold">{tokenData.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{dateStr.split(',')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{dateStr.split(',')[1]?.trim() || ''}</span>
              </div>
            </div>
            
            <div className="border-b border-dashed border-slate-400 my-2"></div>
            <div className="font-bold mb-1">REPRESENTING DETAIL:</div>
            <div className="text-[11px] leading-tight italic break-all">
              {tokenData.detail || 'General Consultation'}
            </div>
            
            {/* Styled Barcode Mockup */}
            <div className="mt-4 flex flex-col items-center">
              <div className="h-8 flex gap-[1px] items-stretch bg-white">
                {[1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 1, 4, 1, 2, 1].map((width, idx) => (
                  <div
                    key={idx}
                    className="bg-black"
                    style={{ width: `${width}px` }}
                  />
                ))}
              </div>
              <span className="text-[8px] mt-1 font-bold">{tokenData.tokenId}</span>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2"></div>
            <div className="text-center text-[8px] font-bold text-slate-500 leading-tight mt-2">
              Thank you for choosing LifeFlow.<br />
              Please wait for your token to be called.
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-end gap-3 p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose} size="sm">
            Close Preview
          </Button>
          <Button onClick={handlePrint} size="sm" className="flex items-center gap-1.5">
            <Printer className="h-4 w-4" /> Trigger Thermal Print
          </Button>
        </div>
      </Card>
    </div>
  );
};
