# abort on errors
set -e

# build
# npm run build

# navigate into the build output directory
cd dist

# if you are deploying to a custom domain
# echo 'www.example.com' > CNAME

git init
git add -A
git commit -m 'deploy'

# if you are deploying to https://<USERNAME>.github.io
git push -f https://github.com/scorpjke/3d.git master
# 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
cd ..\

# if you are deploying to https://<USERNAME>.github.io/<REPO>
# git push -f git@github.com:<USERNAME>/<REPO>.git master:gh-pages


PAUSE