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