#!/usr/bin/env python3
"""
Outlook Manager for macOS - Open emails silently
"""
import subprocess
import sys
import json
from typing import Optional, Dict


class OutlookManager:
    """Manages Outlook operations using AppleScript on macOS."""

    def __init__(self):
        self.app_name = "Microsoft Outlook"

    def _run_applescript(self, script: str) -> Optional[str]:
        """Execute an AppleScript command."""
        try:
            result = subprocess.run(
                ['osascript', '-e', script],
                capture_output=True,
                text=True,
                timeout=15
            )
            if result.returncode == 0:
                return result.stdout.strip()
            else:
                print(f"AppleScript error: {result.stderr}", file=sys.stderr)
                return None
        except subprocess.TimeoutExpired:
            print("AppleScript timeout", file=sys.stderr)
            return None
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            return None

    def search_and_open_by_subject(self, subject: str, folders: list = None) -> bool:
        """
        Search for email by subject and open it silently.

        Args:
            subject: Email subject to search for
            folders: List of folder names to search (default: ["Inbox", "Sent Items", "Sent"])

        Returns:
            True if found and opened, False otherwise
        """
        if folders is None:
            folders = ["Inbox", "Sent Items", "Sent"]

        # Escape quotes in subject
        escaped_subject = subject.replace('"', '\\"').replace('\\', '\\\\')

        # Build folder search list
        folder_list = '", "'.join(folders)

        script = f'''
        tell application "{self.app_name}"
            try
                set targetFolders to {{"{folder_list}"}}
                set foundMessage to missing value
                set mostRecentDate to missing value

                -- Search through specified folders
                repeat with folderName in targetFolders
                    try
                        repeat with aFolder in (get every mail folder)
                            if name of aFolder is folderName then
                                -- Get messages whose subject contains search term
                                set matchingMessages to (messages of aFolder whose subject contains "{escaped_subject}")

                                if (count of matchingMessages) > 0 then
                                    -- Find the most recent message
                                    repeat with aMessage in matchingMessages
                                        set msgDate to time received of aMessage
                                        if mostRecentDate is missing value or msgDate > mostRecentDate then
                                            set mostRecentDate to msgDate
                                            set foundMessage to aMessage
                                        end if
                                    end repeat
                                end if
                            end if
                        end repeat
                    end try
                end repeat

                -- Open the message if found
                if foundMessage is not missing value then
                    open foundMessage
                    activate
                    return "SUCCESS"
                else
                    return "NOTFOUND"
                end if

            on error errMsg
                return "ERROR:" & errMsg
            end try
        end tell
        '''

        result = self._run_applescript(script)

        if result == "SUCCESS":
            return True
        elif result == "NOTFOUND":
            print(f"Email not found: {subject}", file=sys.stderr)
            return False
        elif result and result.startswith("ERROR:"):
            print(f"Error: {result[6:]}", file=sys.stderr)
            return False
        else:
            return False

    def search_by_message_id_header(self, message_id: str) -> bool:
        """
        Search for email by Message-ID header and open it.

        Args:
            message_id: Internet Message ID from email headers

        Returns:
            True if found and opened, False otherwise
        """
        # Escape special characters
        escaped_id = message_id.replace('"', '\\"').replace('\\', '\\\\')

        script = f'''
        tell application "{self.app_name}"
            try
                set foundMessage to missing value

                -- Search through all messages
                repeat with aMessage in (every message)
                    try
                        set msgHeaders to source of aMessage
                        if msgHeaders contains "{escaped_id}" then
                            set foundMessage to aMessage
                            exit repeat
                        end if
                    end try
                end repeat

                -- Open if found
                if foundMessage is not missing value then
                    open foundMessage
                    activate
                    return "SUCCESS"
                else
                    return "NOTFOUND"
                end if

            on error errMsg
                return "ERROR:" & errMsg
            end try
        end tell
        '''

        result = self._run_applescript(script)

        if result == "SUCCESS":
            return True
        elif result == "NOTFOUND":
            print(f"Email not found with Message-ID: {message_id}", file=sys.stderr)
            return False
        else:
            return False


def main():
    """Main function."""
    import argparse

    parser = argparse.ArgumentParser(description="Open email in Outlook for Mac")
    parser.add_argument('--subject', type=str, help='Email subject to search for')
    parser.add_argument('--message-id', type=str, help='Internet Message ID')
    parser.add_argument('--folders', type=str, nargs='+',
                       default=["Inbox", "Sent Items", "Sent"],
                       help='Folders to search in')
    parser.add_argument('--json', action='store_true', help='Output JSON result')

    args = parser.parse_args()

    if not args.subject and not args.message_id:
        parser.print_help()
        sys.exit(1)

    manager = OutlookManager()
    success = False

    if args.message_id:
        success = manager.search_by_message_id_header(args.message_id)
    elif args.subject:
        success = manager.search_and_open_by_subject(args.subject, args.folders)

    if args.json:
        print(json.dumps({"success": success}))
    else:
        if success:
            print("✓ Email opened")
        else:
            print("✗ Failed to open email")

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
