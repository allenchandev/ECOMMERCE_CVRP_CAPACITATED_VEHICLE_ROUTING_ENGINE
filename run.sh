#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Check if javac is in PATH, otherwise use the detected JDK 21 compiler
if command -v javac >/dev/null 2>&1; then
    JAVAC_CMD="javac"
elif [ -f "/home/lenwin/.antigravity-ide/extensions/redhat.java-1.56.0-linux-x64/jre/21.0.12.1-linux-x86_64/bin/javac" ]; then
    JAVAC_CMD="/home/lenwin/.antigravity-ide/extensions/redhat.java-1.56.0-linux-x64/jre/21.0.12.1-linux-x86_64/bin/javac"
elif [ -f "/home/lenwin/BurpSuiteCommunity/jre/bin/javac" ]; then
    JAVAC_CMD="/home/lenwin/BurpSuiteCommunity/jre/bin/javac"
else
    echo "Error: javac compiler not found." >&2
    exit 1
fi

echo "Compiling Java sources using: $JAVAC_CMD..."
mkdir -p bin
"$JAVAC_CMD" -d bin \
    src/com/ecommerce/routing/model/*.java \
    src/com/ecommerce/routing/infrastructure/*.java \
    src/com/ecommerce/routing/service/*.java \
    src/com/ecommerce/routing/engine/*.java \
    src/com/ecommerce/routing/*.java

echo "Build successful! Executing application..."
echo ""
java -cp bin com.ecommerce.routing.Main
