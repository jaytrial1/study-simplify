# PDF to Markdown Conversion Guide

## Overview
This guide explains how to convert your existing PDF files to Markdown (.md) format for use with the updated text extraction system.

## Why Convert to Markdown?
- **Simplicity**: Markdown files are plain text and much easier to process
- **Accuracy**: Direct text rather than extracted text means better quality
- **Performance**: Reading MD files is significantly faster than extracting from PDFs
- **Compatibility**: Better compatibility with PHP-only hosting environments

## Conversion Methods

### Method 1: Manual Conversion
For best quality and control:

1. Open the PDF file
2. Copy the text content
3. Paste into a text editor
4. Format using Markdown syntax if needed:
   - `# Heading 1`
   - `## Heading 2`
   - `**bold text**`
   - `*italic text*`
   - Bullet lists with `-` or `*`
5. Save the file with `.md` extension in the same location as your PDF, with the same base name
   - Example: Convert `grade/subject/chapter/question1.pdf` to `grade/subject/chapter/question1.md`

### Method 2: Batch Conversion Tools

If you have many PDFs to convert, you can use tools like:

- **Pandoc**: Command-line tool that can convert from PDF to Markdown
  ```
  pandoc -s input.pdf -o output.md
  ```

- **Online Converters**: Services like PDF2MD (https://pdf2md.morethan.io/)

### Method 3: Use Python One Last Time

If you still have Python available on your development machine, you can convert all your PDFs to MD using this script:

```python
import os
import sys
import PyPDF2

def convert_pdf_to_md(pdf_path, output_dir=None):
    """Convert a PDF file to Markdown format."""
    try:
        # Open the PDF file
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            
            # Extract text from all pages
            for page in reader.pages:
                text += page.extract_text() + "\n\n"
        
        # Determine output path
        if output_dir:
            base_name = os.path.basename(pdf_path)
            base_name = os.path.splitext(base_name)[0] + '.md'
            output_path = os.path.join(output_dir, base_name)
        else:
            output_path = os.path.splitext(pdf_path)[0] + '.md'
            
        # Write to markdown file
        with open(output_path, 'w', encoding='utf-8') as md_file:
            md_file.write(text)
            
        print(f"Converted {pdf_path} to {output_path}")
        return True
        
    except Exception as e:
        print(f"Error converting {pdf_path}: {str(e)}")
        return False

def batch_convert(base_dir):
    """Recursively convert all PDFs in a directory to Markdown."""
    success_count = 0
    fail_count = 0
    
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.lower().endswith('.pdf'):
                pdf_path = os.path.join(root, file)
                if convert_pdf_to_md(pdf_path):
                    success_count += 1
                else:
                    fail_count += 1
    
    print(f"Conversion complete. Success: {success_count}, Failed: {fail_count}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_to_md.py <directory>")
        sys.exit(1)
        
    directory = sys.argv[1]
    if not os.path.isdir(directory):
        print(f"Error: {directory} is not a valid directory")
        sys.exit(1)
        
    batch_convert(directory)
```

Save this as `pdf_to_md.py` and run it with:
```
python pdf_to_md.py path/to/pdf_repository
```

## File Placement

Make sure to place your MD files in the same directory structure:
```
public/pdf_repository/
  ├── grade/
  │   ├── subject/
  │   │   ├── chapter/
  │   │   │   ├── question1.md
  │   │   │   └── ...
```

## Verifying Your Conversion

After converting files, you can check that the MD file contains all the text content you expect by opening it in any text editor. 