import pytesseract
from pdf2image import convert_from_path
from PIL import Image
from docx import Document
import tkinter as tk
from tkinter import filedialog

# اگر نیاز است مسیر Tesseract را مشخص کنید:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def pdf_to_word(pdf_path):
    # تبدیل صفحات PDF به تصاویر
    images = convert_from_path(pdf_path, 300)  # 300dpi برای دقت بالاتر OCR
    document = Document()  # ساختن فایل Word جدید

    # پردازش هر صفحه PDF
    for page_num, img in enumerate(images):
        print(f"در حال پردازش صفحه {page_num + 1}...")
        # استخراج متن از تصویر با استفاده از Tesseract
        text = pytesseract.image_to_string(img, lang='fas')  # lang='fas' برای OCR فارسی
        document.add_page_break()  # شروع صفحه جدید در فایل Word
        document.add_paragraph(text)  # افزودن متن استخراج‌شده

    # ذخیره فایل Word
    output_word_path = pdf_path.replace('.pdf', '.docx')
    document.save(output_word_path)
    print(f"فایل Word ذخیره شد: {output_word_path}")
    return output_word_path


def open_file_dialog():
    # باز کردن دیالوگ انتخاب فایل
    root = tk.Tk()
    root.withdraw()  # مخفی کردن پنجره اصلی
    file_path = filedialog.askopenfilename(filetypes=[("PDF files", "*.pdf")])
    if file_path:
        output_word = pdf_to_word(file_path)
        print(f"فایل Word خروجی: {output_word}")
    else:
        print("هیچ فایلی انتخاب نشد.")


# اجرای برنامه
if __name__ == "__main__":
    open_file_dialog()