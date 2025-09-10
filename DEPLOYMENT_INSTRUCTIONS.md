# GitHub Pages Setup Instructions

This repository now includes a GitHub Actions workflow that will automatically deploy the COMFI webpage to GitHub Pages. To complete the setup, please follow these steps:

## 1. Enable GitHub Pages

1. Go to your repository settings: https://github.com/MaximeSabbah/comfi-page/settings
2. Scroll down to the "Pages" section in the left sidebar
3. Under "Source", select "GitHub Actions"
4. Save the settings

## 2. Merge or Push to Main Branch

The workflow is configured to deploy when changes are pushed to the `main` branch. You can either:

- Merge this pull request into the main branch, or  
- Push the changes directly to main

## 3. Monitor Deployment

1. Go to the Actions tab: https://github.com/MaximeSabbah/comfi-page/actions
2. You should see the "Deploy to GitHub Pages" workflow running
3. Once complete, your webpage will be live at: `https://maximesabbah.github.io/comfi-page/`

## 4. Customize Content

The webpage currently includes placeholder content. You can edit:

- `index.html` - Update title, authors, abstract, and links
- `style.css` - Modify the visual styling
- Add additional files like images, PDFs, etc.

## Automatic Deployment

After the initial setup, any future changes pushed to the main branch will automatically trigger a new deployment to GitHub Pages.

## Files Created

- `index.html` - Main webpage
- `style.css` - Styling 
- `.github/workflows/deploy.yml` - Deployment workflow