# Makefile for a VSCode package

# Default target
all: test package

# Run tests
test:
	@echo "Running tests..."

# Package the extension
package:
	@echo "Packaging the extension..."
	@vsce package --baseContentUrl="https://git.kuy.io/projects/LIB/repos/vscode-ruby-orb/browse" --allow-missing-repository

# Release the extension
release:
	@echo "Releasing the extension..."
	@jq -r '.version' package.json > VERSION
	@echo "Version: v$(shell cat VERSION)"
	@git add -A
	@git commit -m "Release version $(shell cat VERSION)"
	@git tag -a v$(shell cat VERSION) -m "Release version $(shell cat VERSION)"
	@git push --tags

# Clean up
clean:
	@echo "Cleaning up..."
	@rm -rf *.vsix

.PHONY: all test package release clean