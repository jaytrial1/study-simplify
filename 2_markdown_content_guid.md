# Markdown Content Formatting Guide

## Overview
This guide explains the recommended format for creating content files for the StudySimplify system. The system reads content directly from Markdown (.md) files.

## Why Use Markdown?
- **Simplicity**: Markdown files are plain text and easy to create and edit.
- **Accuracy**: Direct text ensures content quality without extraction errors.
- **Performance**: Reading plain text MD files is significantly faster than processing other formats.
- **Compatibility**: Works natively with the PHP-based system.

## Content Creation Methods

### Method 1: Manual Creation (Recommended)
This provides the best quality and control:

1.  Create a new text file.
2.  Write or paste your content.
3.  Format using standard Markdown syntax as needed:
    *   `# Heading 1`
    *   `## Heading 2`
    *   `### Heading 3` etc.
    *   `**bold text**` or `__bold text__`
    *   `*italic text*` or `_italic text_`
    *   Bullet lists using `-`, `*`, or `+` (e.g., `- Point 1`)
    *   Numbered lists (e.g., `1. First item`)
    *   Code blocks using triple backticks: ```php ... ```
    *   Inline code using single backticks: `code`
    *   Links: `[Link text](https://example.com)`
4.  Save the file with a `.md` extension.

### Method 2: Using Conversion Tools (External)
If you have existing content in other formats (like PDF or Word), you can use external tools to help convert them to Markdown *before* adding them to the system. These tools are **not** part of the StudySimplify application itself.

*   **Pandoc**: A powerful command-line tool.
    ```bash
    # Example: Convert Word docx to Markdown
    pandoc input.docx -o output.md 
    
    # Example: Convert PDF to Markdown (results may vary in quality)
    pandoc input.pdf -o output.md 
    ```
*   **Online Converters**: Various websites offer conversion services (e.g., search for "PDF to Markdown online" or "Word to Markdown online"). *Review the output carefully for formatting accuracy.* 

**Important:** After using any conversion tool, always review the resulting `.md` file and clean up the formatting manually as needed.

## File Placement
Place your finished `.md` files in the correct directory structure within the `public/pdf_repository/` folder:

```
public/pdf_repository/
  ├── [grade]/         e.g., b.com, 11_CBSE
  │   ├── [subject]/     e.g., Accountancy, Physics
  │   │   ├── [chapter]/   e.g., Chapter_1, Unit_3
  │   │   │   ├── question1.md
  │   │   │   ├── topic_about_something.md
  │   │   │   └── ...
```
*   Use underscores (`_`) or hyphens (`-`) instead of spaces in directory and file names.
*   Ensure the file name (without `.md`) matches the identifier used in the system (e.g., the name displayed in the question list).

## Verifying Your Content
After creating or converting your `.md` files:
1.  Open them in a text editor or a Markdown previewer to check the content and formatting.
2.  Ensure they are placed in the correct `grade/subject/chapter/` path.
3.  Test content retrieval through the application's navigation and chatbot interface. 