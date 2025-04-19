import requests
import csv
from bs4 import BeautifulSoup

def build_flashcards_csv(
    url="https://1000mostcommonwords.com/1000-most-common-filipino-words/",
    output_path="flashcards.csv"
):
    # 1. Fetch the page
    resp = requests.get(url)
    resp.raise_for_status()

    # 2. Parse with BeautifulSoup
    soup = BeautifulSoup(resp.text, "html.parser")

    # 3. Find the table of words
    #    (on that site it's the first <table> element)
    table = soup.find("table")
    if not table:
        raise RuntimeError("Could not find table on the page")

    # 4. Extract rows
    rows = table.find_all("tr")

    # 5. Write CSV
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Tagalog", "English"])  # header

        for row in rows:
            cols = row.find_all("td")
            # the page layout is: Rank | Filipino | English | …
            if len(cols) >= 3:
                tagalog = cols[1].get_text(strip=True)
                english = cols[2].get_text(strip=True)
                writer.writerow([tagalog, english])

    print(f"✅ Wrote {output_path} with {len(rows)-1} entries.")

if __name__ == "__main__":
    build_flashcards_csv()