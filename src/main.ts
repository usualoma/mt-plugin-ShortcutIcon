const DB_NAME = "mt-plugin-ShortcutIcon";
const HAS_SHORTCUT_ICON_KEY = "mt-plugin-ShortcutIcon-has-shortcut-icon";

const defaultIcon = document.querySelector('link[rel="icon"]');
if (sessionStorage.getItem(HAS_SHORTCUT_ICON_KEY)) {
  defaultIcon?.remove();
}

let showResetButton = (blobUrl: string) => {};

const setShortcutIcon = () => {
  const request = indexedDB.open(DB_NAME, 1);

  request.onerror = () => {
    console.error("データベースの開封に失敗しました");
  };

  request.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    if (!db.objectStoreNames.contains("icons")) {
      db.createObjectStore("icons");
    }
  };

  request.onsuccess = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    const transaction = db.transaction(["icons"], "readonly");
    const store = transaction.objectStore("icons");

    const getRequest = store.get("shortcutIcon");

    getRequest.onsuccess = () => {
      const imageData = getRequest.result;
      if (imageData) {
        const byteString = atob(imageData.split(",")[1]);
        const mimeType = imageData.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }

        defaultIcon?.remove();
        sessionStorage.setItem(HAS_SHORTCUT_ICON_KEY, "true");

        const blob = new Blob([ab], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);

        const linkElement =
          document.querySelector('link[rel="shortcut icon"]') ||
          document.createElement("link");
        linkElement.setAttribute("rel", "shortcut icon");
        linkElement.setAttribute("href", blobUrl);
        showResetButton(blobUrl);

        if (!document.querySelector('link[rel="shortcut icon"]')) {
          document.head.appendChild(linkElement);
        }
      }
    };

    getRequest.onerror = () => {
      console.error("アイコンの読み込みに失敗しました");
    };
  };
};
setShortcutIcon();

if (document.querySelector("html")?.dataset.screenId === "list-plugins") {
  document.querySelectorAll("div.mt-pluginpanel").forEach((el) => {
    const pluginName = el
      .querySelector("span.plugin-version")
      ?.parentElement?.textContent?.trim()
      .split(" ")[0]
      .trim();

    if (pluginName === "ShortcutIcon") {
      const marker = el.querySelector(".plugin-metadata");
      const setIconButton = document.createElement("button");
      setIconButton.type = "button";
      setIconButton.classList.add("btn", "btn-default");
      setIconButton.textContent = "アイコンを設定";
      setIconButton.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";

        input.addEventListener("change", (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (e) => {
            const imageData = e.target?.result;
            if (!imageData) return;

            const request = indexedDB.open(DB_NAME, 1);

            request.onerror = () => {
              console.error("データベースの開封に失敗しました");
            };

            request.onupgradeneeded = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              if (!db.objectStoreNames.contains("icons")) {
                db.createObjectStore("icons");
              }
            };

            request.onsuccess = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              const transaction = db.transaction(["icons"], "readwrite");
              const store = transaction.objectStore("icons");

              const putRequest = store.put(imageData, "shortcutIcon");

              putRequest.onsuccess = () => {
                setShortcutIcon();
              };

              putRequest.onerror = () => {
                console.error("アイコンの保存に失敗しました");
              };
            };
          };
          reader.readAsDataURL(file);
        });

        input.click();
      });
      marker?.parentElement?.insertBefore(
        setIconButton,
        marker?.nextSibling || null
      );

      showResetButton = (blobUrl: string) => {
        document
          .querySelectorAll(
            ".mt-plugin-reset-button, .mt-plugin-reset-button-img"
          )
          ?.forEach((el) => el.remove());

        const button = document.createElement("button");
        button.type = "button";
        button.classList.add(
          "btn",
          "btn-default",
          "ml-2",
          "mt-plugin-reset-button"
        );
        button.textContent = "アイコンをリセット";
        marker?.parentElement?.insertBefore(
          button,
          setIconButton.nextSibling || null
        );

        const img = document.createElement("img");
        img.style.width = "128px";
        img.style.display = "block";
        img.classList.add("mt-plugin-reset-button-img");
        img.src = blobUrl;
        marker?.parentElement?.insertBefore(img, button);

        button.addEventListener("click", () => {
          indexedDB.deleteDatabase(DB_NAME);
          sessionStorage.removeItem(HAS_SHORTCUT_ICON_KEY);
          document.querySelector('link[rel="shortcut icon"]')?.remove();
          if (defaultIcon) {
            document.head.appendChild(defaultIcon);
          }
          button.remove();
          img.remove();
        });
      };
    }
  });
}
