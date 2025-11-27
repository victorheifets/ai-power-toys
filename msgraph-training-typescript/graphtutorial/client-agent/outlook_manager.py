#!/usr/bin/env python3
"""
Outlook Manager for macOS
Manages Microsoft Outlook operations including email search functionality.
"""

import subprocess
import sys
import json
from typing import List, Dict, Optional


class OutlookManager:
    """Manages Outlook operations using AppleScript on macOS."""

    def __init__(self):
        """Initialize the Outlook Manager."""
        self.app_name = "Microsoft Outlook"

    def _run_applescript(self, script: str) -> Optional[str]:
        """
        Execute an AppleScript command.

        Args:
            script: The AppleScript code to execute

        Returns:
            The output of the script or None if execution failed
        """
        try:
            result = subprocess.run(
                ['osascript', '-e', script],
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            print(f"Error executing AppleScript: {e.stderr}", file=sys.stderr)
            return None

    def is_outlook_running(self) -> bool:
        """Check if Microsoft Outlook is running."""
        script = f'''
        tell application "System Events"
            return (name of processes) contains "{self.app_name}"
        end tell
        '''
        result = self._run_applescript(script)
        return result == "true"

    def open_email(self, email_id: str) -> bool:
        """
        Open an email in Outlook by its ID.

        Args:
            email_id: The ID of the email to open

        Returns:
            True if successful, False otherwise
        """
        if not self.is_outlook_running():
            print(f"Error: {self.app_name} is not running. Please start Outlook first.", file=sys.stderr)
            return False

        script = f'''
        tell application "{self.app_name}"
            try
                set theMessage to message id {email_id}
                open theMessage
                activate
                return "SUCCESS"
            on error errMsg
                return "ERROR:" & errMsg
            end try
        end tell
        '''

        result = self._run_applescript(script)

        if result and result == "SUCCESS":
            return True
        else:
            error_msg = result[6:] if result and result.startswith("ERROR:") else "Unknown error"
            print(f"Error opening email: {error_msg}", file=sys.stderr)
            return False

    def list_folders(self) -> List[Dict[str, any]]:
        """
        List all mail folders in Outlook with their message counts.

        Returns:
            List of dictionaries containing folder information
        """
        if not self.is_outlook_running():
            print(f"Error: {self.app_name} is not running. Please start Outlook first.", file=sys.stderr)
            return []

        script = f'''
        tell application "{self.app_name}"
            set folderInfo to {{}}
            try
                repeat with aFolder in (get every mail folder)
                    set folderName to name of aFolder
                    set msgCount to count messages of aFolder
                    set info to folderName & "|" & msgCount
                    set end of folderInfo to info
                end repeat

                set AppleScript's text item delimiters to "
"
                set resultText to folderInfo as text
                set AppleScript's text item delimiters to ""
                return resultText
            on error errMsg
                return "ERROR:" & errMsg
            end try
        end tell
        '''

        result = self._run_applescript(script)

        if not result:
            return []

        if result.startswith("ERROR:"):
            print(f"Error listing folders: {result[6:]}", file=sys.stderr)
            return []

        folders = []
        if result:
            lines = result.split('\n')
            for line in lines:
                if '|' in line:
                    parts = line.rsplit('|', 1)
                    if len(parts) == 2:
                        name, count = parts
                        try:
                            folders.append({'name': name, 'count': int(count)})
                        except ValueError:
                            continue

        return folders

    def search_and_open_email(self, subject: str, folder: str = "Inbox", exact_match: bool = True, internet_message_id: str = None) -> bool:
        """
        Search for an email by subject and/or Internet Message-ID and open it.

        Args:
            subject: The subject text to search for
            folder: The folder name to search in
            exact_match: If True, match exact subject; if False, match substring
            internet_message_id: Internet Message-ID to find exact email

        Returns:
            True if found and opened, False otherwise
        """
        if not self.is_outlook_running():
            print(f"Error: {self.app_name} is not running. Please start Outlook first.", file=sys.stderr)
            return False

        # Escape double quotes in search term
        escaped_subject = subject.replace('"', '\\"').replace('\\', '\\\\')
        escaped_folder = folder.replace('"', '\\"')
        escaped_message_id = internet_message_id.replace('"', '\\"').replace('<', '').replace('>', '') if internet_message_id else None

        # Build the search condition
        if exact_match:
            subject_condition = f'subject is "{escaped_subject}"'
        else:
            subject_condition = f'subject contains "{escaped_subject}"'

        script = f'''
        tell application "{self.app_name}"
            try
                set foundMessage to missing value

                -- Search through all folders with matching name
                repeat with aFolder in (get every mail folder)
                    if name of aFolder is "{escaped_folder}" then
                        -- Get messages matching criteria
                        set matchingMessages to (messages of aFolder whose {subject_condition})

                        if (count of matchingMessages) > 0 then
                            -- If we have internet_message_id, find exact match
                            {"set msgIdToFind to " + '"' + escaped_message_id + '"' if escaped_message_id else ""}

                            repeat with aMessage in matchingMessages
                                {"try" if escaped_message_id else ""}
                                    {"set msgSource to source of aMessage" if escaped_message_id else ""}
                                    {"if msgSource contains msgIdToFind then" if escaped_message_id else ""}
                                        set foundMessage to aMessage
                                        exit repeat
                                    {"end if" if escaped_message_id else ""}
                                {"end try" if escaped_message_id else ""}
                            end repeat

                            -- If no internet_message_id match or no internet_message_id provided, use first match
                            if foundMessage is missing value and (count of matchingMessages) > 0 then
                                set foundMessage to item 1 of matchingMessages
                            end if

                            -- Open the message
                            if foundMessage is not missing value then
                                open foundMessage
                                activate
                                set msgSubject to subject of foundMessage
                                set msgSender to sender of foundMessage
                                set msgDate to time received of foundMessage
                                return "SUCCESS|SUBJECT:" & msgSubject & "|SENDER:" & (address of msgSender) & "|DATE:" & (msgDate as string)
                            end if
                        end if
                    end if
                end repeat

                return "NOTFOUND"
            on error errMsg
                return "ERROR:" & errMsg
            end try
        end tell
        '''

        result = self._run_applescript(script)

        if not result:
            return False

        if result == "NOTFOUND":
            print(f"No email found with '{subject}' in {folder}", file=sys.stderr)
            return False

        if result.startswith("ERROR:"):
            print(f"Error: {result[6:]}", file=sys.stderr)
            return False

        if result.startswith("SUCCESS|"):
            # Parse and display the email info
            info = result[8:]  # Remove "SUCCESS|"
            email_info = {}
            parts = info.split('|')

            for part in parts:
                if ':' in part:
                    key, value = part.split(':', 1)
                    email_info[key.lower()] = value

            print(f"SUCCESS: Found and opened email")
            return True

        return False

    def search_emails_by_subject(self, subject: str, folder: str = "inbox") -> List[Dict[str, str]]:
        """
        Search for emails by subject in a specific folder.

        Args:
            subject: The subject text to search for (case-insensitive partial match)
            folder: The folder name to search in (e.g., 'inbox', 'sent', or custom folder name)

        Returns:
            List of dictionaries containing email information (including email ID)
        """
        if not self.is_outlook_running():
            print(f"Error: {self.app_name} is not running. Please start Outlook first.", file=sys.stderr)
            return []

        # Escape double quotes in search term and folder name
        escaped_subject = subject.replace('"', '\\"')
        escaped_folder = folder.replace('"', '\\"')

        script = f'''
        tell application "{self.app_name}"
            set searchResults to {{}}
            set searchTerm to "{escaped_subject}"
            set foundResult to false

            try
                -- Search through all mail folders with matching name (handles multiple accounts)
                repeat with aFolder in (get every mail folder)
                    if name of aFolder is "{escaped_folder}" then
                        set allMessages to messages of aFolder

                        repeat with aMessage in allMessages
                            set msgSubject to subject of aMessage

                            -- AppleScript contains is case-insensitive by default
                            if msgSubject contains searchTerm then
                                set msgSender to sender of aMessage
                                set msgDate to time received of aMessage
                                set msgId to id of aMessage
                                set msgInfo to "SUBJECT:" & msgSubject & "|SENDER:" & (address of msgSender) & "|DATE:" & (msgDate as string) & "|ID:" & msgId
                                set end of searchResults to msgInfo
                                set foundResult to true
                                -- Stop after finding first result for speed
                                exit repeat
                            end if
                        end repeat

                        -- If found in this folder, stop searching other folders
                        if foundResult then exit repeat
                    end if
                end repeat

                -- Join results with newline
                set AppleScript's text item delimiters to "
"
                set resultText to searchResults as text
                set AppleScript's text item delimiters to ""

                return resultText
            on error errMsg
                return "ERROR:" & errMsg
            end try
        end tell
        '''

        result = self._run_applescript(script)

        if not result:
            return []

        if result.startswith("ERROR:"):
            print(f"Error searching emails: {result[6:]}", file=sys.stderr)
            return []

        # Parse results
        emails = []
        if result:
            lines = result.split('\n')
            for line in lines:
                if not line:
                    continue

                email_info = {}
                parts = line.split('|')

                for part in parts:
                    if ':' in part:
                        key, value = part.split(':', 1)
                        email_info[key.lower()] = value

                if email_info:
                    emails.append(email_info)

        return emails

    def display_search_results(self, emails: List[Dict[str, str]], folder: str):
        """
        Display search results in a formatted manner.

        Args:
            emails: List of email dictionaries
            folder: The folder that was searched
        """
        if not emails:
            print(f"\nNo emails found in {folder}.")
            return

        print(f"\n{'='*80}")
        print(f"Found {len(emails)} email(s) in {folder.upper()}")
        print(f"{'='*80}\n")

        for idx, email in enumerate(emails, 1):
            print(f"{idx}. Subject: {email.get('subject', 'N/A')}")
            print(f"   From: {email.get('sender', 'N/A')}")
            print(f"   Date: {email.get('date', 'N/A')}")
            print(f"   {'-'*76}")


def main():
    """Main function to run the Outlook Manager."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Outlook Manager for macOS - Search and manage emails",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  List all folders:
    python outlook_manager.py list-folders

  Search in inbox:
    python outlook_manager.py search "Meeting" --folder Inbox

  Search in sent items:
    python outlook_manager.py search "Report" --folder "Sent Items"

  Search in custom folder:
    python outlook_manager.py search "atlas" --folder "MongoDB atlas"

  Note: The script automatically opens the first matching email found.
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # List folders command
    list_parser = subparsers.add_parser('list-folders', help='List all mail folders')

    # Search command
    search_parser = subparsers.add_parser('search', help='Search emails by subject')
    search_parser.add_argument('subject', type=str, help='Subject text to search for')
    search_parser.add_argument(
        '--folder',
        type=str,
        default='Inbox',
        help='Folder to search in (default: Inbox). Use list-folders to see all available folders.'
    )
    search_parser.add_argument(
        '--message-id',
        type=str,
        dest='message_id',
        help='Internet Message-ID for exact matching'
    )
    search_parser.add_argument(
        '--exact',
        action='store_true',
        default=True,
        help='Use exact subject matching (default: True)'
    )
    search_parser.add_argument(
        '--contains',
        action='store_false',
        dest='exact',
        help='Use substring subject matching instead of exact'
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    manager = OutlookManager()

    if args.command == 'list-folders':
        print("\nListing all mail folders in Outlook...")
        folders = manager.list_folders()

        if folders:
            print(f"\n{'='*80}")
            print(f"{'Folder Name':<50} {'Message Count':>15}")
            print(f"{'='*80}")
            for folder in folders:
                if folder['count'] > 0:  # Only show folders with messages
                    print(f"{folder['name']:<50} {folder['count']:>15,}")
            print(f"{'='*80}\n")
        else:
            print("No folders found or an error occurred.")

    elif args.command == 'search':
        print(f"\nSearching for '{args.subject}' in {args.folder}...")
        success = manager.search_and_open_email(
            args.subject,
            args.folder,
            exact_match=getattr(args, 'exact', True),
            internet_message_id=getattr(args, 'message_id', None)
        )
        if success:
            print("✓ Email opened successfully in Outlook")
            sys.exit(0)
        else:
            print("✗ No matching email found or error occurred")
            sys.exit(1)


if __name__ == "__main__":
    main()
