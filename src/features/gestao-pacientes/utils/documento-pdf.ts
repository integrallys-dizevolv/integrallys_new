import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');

export async function gerarCadastroPdf(target: HTMLElement, patientName: string) {
  const canvas = await html2canvas(target, {
    scale: 2,
    backgroundColor: '#ffffff',
  });

  const image = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(image, 'PNG', 0, 0, pdfWidth, pdfHeight);

  const fileName = `cadastro_${sanitizeFileName(patientName || 'paciente')}_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  pdf.save(fileName);
}

export function abrirWhatsAppCadastro(phone: string, patientName: string) {
  const digits = phone.replace(/\D/g, '');
  const text = encodeURIComponent(`Olá ${patientName}! Segue seu cadastro em anexo.`);
  window.open(`https://wa.me/55${digits}?text=${text}`, '_blank', 'noopener,noreferrer');
}
