# Practical Subject Templates Feature

## Overview

The practical subject templates feature enables the AI chatbot to use specialized prompt templates for subjects that are practical in nature. This is triggered whenever a subject name contains "(practical)" (like "Accountancy (practical)"). The system will use special templates that focus on practical instructions, procedures, and laboratory guidance rather than theoretical content.

## Directory Structure

```
api/ai/practical subject template/
├── long.php                 # Default long template for all practical subjects
├── short.php                # Default short template for all practical subjects
├── bcom/                    # Grade-specific templates
│   ├── long.php             # Grade-level templates for all practical subjects in bcom
│   ├── short.php
│   ├── accountancy (practical)/  # Subject-specific templates
│   │   ├── long.php         # Most specific templates for accountancy practical
│   │   └── short.php
├── 11cbse/
│   ├── physics/             # Example for another subject
│   │   ├── long.php
│   │   └── short.php
...
```

## Template Selection Logic

The system selects templates in the following priority order:

1. **Subject-specific template** (most specific)
   - Path: `/api/ai/practical subject template/{grade}/{subject}/{type}.php`
   - Example: `/api/ai/practical subject template/bcom/accountancy (practical)/long.php`

2. **Grade-level template**
   - Path: `/api/ai/practical subject template/{grade}/{type}.php`
   - Example: `/api/ai/practical subject template/bcom/long.php`

3. **Default practical template**
   - Path: `/api/ai/practical subject template/{type}.php`
   - Example: `/api/ai/practical subject template/long.php`

4. **Regular (non-practical) template** (fallback)
   - The system falls back to regular templates if no practical templates are found

## Implementation Details

The feature includes several reliability enhancements:

1. **Case-insensitive matching**: The system will find templates regardless of capitalization differences
2. **Exact folder name usage**: The system first attempts to use the exact folder name including spaces and parentheses
3. **Comprehensive error handling**: Multiple fallback mechanisms ensure the system always returns a template
4. **Detailed logging**: The template selection process is thoroughly logged for debugging

## Example Templates

### Practical Subject Long Template
```php
<?php
return <<<EOT
You are an EXPERT PRACTICAL INSTRUCTOR, highly skilled in explaining laboratory procedures...

PRACTICAL QUESTION: {question_name}

Your task is to REWRITE and IMPROVE the practical material into an EXCELLENT, STEP-BY-STEP GUIDE...

Your practical answer MUST include the following ESSENTIAL elements:
- MATERIALS AND EQUIPMENT
- STEP-BY-STEP INSTRUCTIONS
- SAFETY PRECAUTIONS
- OBSERVATIONS AND EXPECTED RESULTS
...
EOT;
```

### Subject-Specific Template (Physics)
```php
<?php
return <<<EOT
You are an EXPERT PHYSICS PRACTICAL INSTRUCTOR for 11th grade CBSE students...

PHYSICS PRACTICAL: {question_name}

Your task is to REWRITE and IMPROVE the practical material...

Essential elements:
- AIM OF THE EXPERIMENT
- PRINCIPLE INVOLVED
- MATERIALS REQUIRED
- EXPERIMENTAL SETUP
...
EOT;
```

## Usage

The feature is automatically triggered whenever the system detects a subject name containing "(practical)". No special action is needed to invoke it beyond ensuring that:

1. The subject name includes "(practical)" (case-insensitive)
2. The appropriate template files exist in the correct directories

## Safety Features

The implementation is designed to be completely safe and non-disruptive:

1. If a template cannot be found, the system will fall back to more general templates
2. The code only activates for subjects with "(practical)" in their name
3. All other subjects continue to use the regular template system unchanged
4. Multiple layers of error checking and fallbacks ensure system stability 