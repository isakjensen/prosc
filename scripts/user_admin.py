#!/usr/bin/env python3
"""
GUI: skapa och redigera användare i samma MySQL-databas som Next.js (tabellen users).

Kör från scripts-mappen:
  pip install -r requirements.txt
  python user_admin.py

Kräver DATABASE_URL i nextjs/.env (mysql://...)
"""

from __future__ import annotations

import tkinter as tk
from tkinter import messagebox, ttk
import uuid

import mysql.connector

from user_db import ROLES, connect, hash_password, validate_role


def _show_error(title: str, err: Exception) -> None:
    messagebox.showerror(title, str(err) or err.__class__.__name__)


class UserAdminApp:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("Fullstack — användare")
        self.root.minsize(420, 360)
        self.root.geometry("480x400")

        nb = ttk.Notebook(self.root)
        nb.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        self._build_create_tab(nb)
        self._build_edit_tab(nb)

    def _build_create_tab(self, nb: ttk.Notebook) -> None:
        tab = ttk.Frame(nb, padding=12)
        nb.add(tab, text="Skapa användare")

        ttk.Label(tab, text="E-post").grid(row=0, column=0, sticky="w", pady=4)
        self.create_email = ttk.Entry(tab, width=42)
        self.create_email.grid(row=0, column=1, sticky="ew", pady=4)

        ttk.Label(tab, text="Namn").grid(row=1, column=0, sticky="w", pady=4)
        self.create_name = ttk.Entry(tab, width=42)
        self.create_name.grid(row=1, column=1, sticky="ew", pady=4)

        ttk.Label(tab, text="Lösenord").grid(row=2, column=0, sticky="w", pady=4)
        self.create_password = ttk.Entry(tab, width=42, show="•")
        self.create_password.grid(row=2, column=1, sticky="ew", pady=4)

        ttk.Label(tab, text="Roll").grid(row=3, column=0, sticky="w", pady=4)
        self.create_role = ttk.Combobox(tab, values=list(ROLES), width=39, state="readonly")
        self.create_role.set("MEMBER")
        self.create_role.grid(row=3, column=1, sticky="ew", pady=4)

        tab.columnconfigure(1, weight=1)

        btn = ttk.Button(tab, text="Skapa användare", command=self._on_create)
        btn.grid(row=4, column=0, columnspan=2, pady=16)

    def _build_edit_tab(self, nb: ttk.Notebook) -> None:
        tab = ttk.Frame(nb, padding=12)
        nb.add(tab, text="Redigera användare")

        ttk.Label(tab, text="E-post (sök)").grid(row=0, column=0, sticky="w", pady=4)
        self.edit_lookup_email = ttk.Entry(tab, width=36)
        self.edit_lookup_email.grid(row=0, column=1, sticky="ew", pady=4)
        ttk.Button(tab, text="Hämta", command=self._on_load_user).grid(
            row=0, column=2, padx=(8, 0), pady=4
        )

        ttk.Label(tab, text="Namn").grid(row=1, column=0, sticky="w", pady=4)
        self.edit_name = ttk.Entry(tab, width=42)
        self.edit_name.grid(row=1, column=1, columnspan=2, sticky="ew", pady=4)

        ttk.Label(tab, text="Roll").grid(row=2, column=0, sticky="w", pady=4)
        self.edit_role = ttk.Combobox(tab, values=list(ROLES), width=39, state="readonly")
        self.edit_role.set("MEMBER")
        self.edit_role.grid(row=2, column=1, columnspan=2, sticky="ew", pady=4)

        ttk.Label(tab, text="Nytt lösenord (valfritt)").grid(
            row=3, column=0, sticky="w", pady=4
        )
        self.edit_password = ttk.Entry(tab, width=42, show="•")
        self.edit_password.grid(row=3, column=1, columnspan=2, sticky="ew", pady=4)

        self.edit_user_id: str | None = None
        self.edit_user_email: str | None = None

        tab.columnconfigure(1, weight=1)

        ttk.Button(tab, text="Spara ändringar", command=self._on_save_user).grid(
            row=4, column=0, columnspan=3, pady=16
        )

    def _on_create(self) -> None:
        email = self.create_email.get().strip()
        name = self.create_name.get().strip()
        password = self.create_password.get()
        try:
            role = validate_role(self.create_role.get())
        except ValueError as e:
            _show_error("Roll", e)
            return

        if not email or not name or not password:
            messagebox.showwarning("Saknas", "Fyll i e-post, namn och lösenord.")
            return

        new_id = str(uuid.uuid4())
        pwd_hash = hash_password(password)

        try:
            conn = connect()
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO users (id, email, passwordHash, name, role, createdAt, updatedAt)
                VALUES (%s, %s, %s, %s, %s, NOW(3), NOW(3))
                """,
                (new_id, email, pwd_hash, name, role),
            )
            conn.commit()
            cur.close()
            conn.close()
        except mysql.connector.Error as e:
            if getattr(e, "errno", None) == 1062:
                messagebox.showerror("Fel", "E-postadressen finns redan.")
            else:
                _show_error("Databas", e)
            return

        messagebox.showinfo("Klar", f"Användare skapad:\n{email}")
        self.create_email.delete(0, tk.END)
        self.create_name.delete(0, tk.END)
        self.create_password.delete(0, tk.END)
        self.create_role.set("MEMBER")

    def _on_load_user(self) -> None:
        email = self.edit_lookup_email.get().strip()
        if not email:
            messagebox.showwarning("Saknas", "Ange e-post att söka.")
            return

        try:
            conn = connect()
            cur = conn.cursor(dictionary=True)
            cur.execute(
                "SELECT id, email, name, role FROM users WHERE email = %s LIMIT 1",
                (email,),
            )
            row = cur.fetchone()
            cur.close()
            conn.close()
        except Exception as e:
            _show_error("Databas", e)
            return

        if not row:
            self.edit_user_id = None
            self.edit_user_email = None
            self.edit_name.delete(0, tk.END)
            self.edit_password.delete(0, tk.END)
            messagebox.showinfo("Hittades inte", f"Ingen användare med e-post:\n{email}")
            return

        self.edit_user_id = row["id"]
        self.edit_user_email = row["email"]
        self.edit_name.delete(0, tk.END)
        self.edit_name.insert(0, row["name"])
        self.edit_role.set(row["role"])
        self.edit_password.delete(0, tk.END)
        messagebox.showinfo("Hämtad", f"{row['email']} — {row['name']} ({row['role']})")

    def _on_save_user(self) -> None:
        if not self.edit_user_id or not self.edit_user_email:
            messagebox.showwarning("Saknas", "Hämta en användare först.")
            return

        name = self.edit_name.get().strip()
        new_password = self.edit_password.get()
        try:
            role = validate_role(self.edit_role.get())
        except ValueError as e:
            _show_error("Roll", e)
            return

        if not name:
            messagebox.showwarning("Saknas", "Namn får inte vara tomt.")
            return

        try:
            conn = connect()
            cur = conn.cursor()
            if new_password:
                pwd_hash = hash_password(new_password)
                cur.execute(
                    """
                    UPDATE users
                    SET name = %s, role = %s, passwordHash = %s, updatedAt = NOW(3)
                    WHERE id = %s
                    """,
                    (name, role, pwd_hash, self.edit_user_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE users
                    SET name = %s, role = %s, updatedAt = NOW(3)
                    WHERE id = %s
                    """,
                    (name, role, self.edit_user_id),
                )
            conn.commit()
            if cur.rowcount == 0:
                messagebox.showwarning("Oväntat", "Ingen rad uppdaterades.")
            else:
                messagebox.showinfo("Sparat", f"Uppdaterade {self.edit_user_email}")
            cur.close()
            conn.close()
        except Exception as e:
            _show_error("Databas", e)
            return

        self.edit_password.delete(0, tk.END)

    def run(self) -> None:
        self.root.mainloop()


def main() -> None:
    UserAdminApp().run()


if __name__ == "__main__":
    main()
