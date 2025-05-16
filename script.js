let currentChats = []; // Store current chats for comparison
let timers = []; // Store interval timers for countdowns

        function formatCountdown(endTime, cardElement, countdownElement) {
            if (!endTime) return 'Unknown';
            const now = Date.now();
            const remainingMs = endTime * 1000 - now; // Convert endTime to ms and calculate remaining
            if (remainingMs <= 0) {
                // Remove card when time reaches zero
                if (cardElement) {
                    cardElement.remove();
                    currentChats = currentChats.filter(chat => chat.i !== cardElement.dataset.chatId);
                    const timer = timers.get(cardElement.dataset.chatId);
                    if (timer) {
                        clearInterval(timer);
                        timers.delete(cardElement.dataset.chatId);
                    }
                }
                return '0h 0m 0s';
            }

            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
            const formattedTime = `${hours}h ${minutes}m ${seconds}s`;

            // Change color to red when 1 minute or less remains
            if (remainingMs <= 60000 && countdownElement) {
                countdownElement.classList.add('warning');
            } else if (countdownElement) {
                countdownElement.classList.remove('warning');
            }

            return formattedTime;
        }

        function createChatCard(chat) {
            const li = document.createElement('li');
            li.className = 'chat-card';
            li.dataset.chatId = chat.i; // Use chat ID for identification

            const cardInner = document.createElement('div');
            cardInner.className = 'chat-card-inner';

            // Front of the card
            const cardFront = document.createElement('div');
            cardFront.className = 'chat-card-front';

            const img = document.createElement('img');
            img.src = chat.a || 'https://i.postimg.cc/6Qw0zt25/image.png';
            img.alt = chat.n;
            img.className = 'chat-image';
            img.onerror = () => { img.src = 'https://i.postimg.cc/6Qw0zt25/image.png'; };

            const name = document.createElement('p');
            name.className = 'chat-name';
            name.textContent = chat.n || 'Unnamed Chat';
            
            const countdown = document.createElement('p');
            countdown.className = 'chat-countdown';
            countdown.textContent = formatCountdown(chat.t, li);

            // Start live countdown
            if (chat.t) {
                const timer = setInterval(() => {
                    countdown.textContent = formatCountdown(chat.t, li);
                }, 1000);
                timers.push({ chatId: chat.i, timer });
            }

            cardFront.appendChild(img);
            cardFront.appendChild(name);
            cardFront.appendChild(countdown);

            // Back of the card
            const cardBack = document.createElement('div');
            cardBack.className = 'chat-card-back';

            const description = document.createElement('p');
            description.className = 'chat-description';
            description.textContent = chat.d || 'No description available';

            const visitButton = document.createElement('a');
            visitButton.className = 'visit-button';
            visitButton.textContent = 'Visitar';
            visitButton.href = `https://xat.com/${encodeURIComponent(chat.n)}`;
            visitButton.target = '_blank';
            visitButton.rel = 'noopener noreferrer';

            cardBack.appendChild(description);
            cardBack.appendChild(visitButton);

            // Assemble card
            cardInner.appendChild(cardFront);
            cardInner.appendChild(cardBack);
            li.appendChild(cardInner);

            return li;
        }

        async function updateChats() {
            const chatList = document.getElementById('chat-list');
            try {
                const response = await fetch('https://illuxat.com/api/promoted-chats');
                if (!response.ok) {
                    throw new Error('Failed to fetch chats');
                }
                const data = await response.json();

                // Filter Spanish chats from promotedChats
                let spanishChats = data.data?.promotedChats?.filter(chat => chat.lang === 'es') || [];

                // If no promoted Spanish chats, use autoPromoted Spanish chats
                if (spanishChats.length === 0) {
                    spanishChats = data.data?.autoPromoted?.filter(chat => chat.lang === 'es') || [];
                }

                // Filter out chats with expired promotion time
                spanishChats = spanishChats.filter(chat => !chat.t || (chat.t * 1000) > Date.now());

                // Identify chats to add, update, or remove
                const newChatIds = spanishChats.map(chat => chat.i);
                const currentChatIds = currentChats.map(chat => chat.i);

                // Remove chats that are no longer in the list
                const chatsToRemove = currentChatIds.filter(id => !newChatIds.includes(id));
                chatsToRemove.forEach(id => {
                    const card = chatList.querySelector(`[data-chat-id="${id}"]`);
                    if (card) card.remove();
                    const timer = timers.get(id);
                    if (timer) {
                        clearInterval(timer);
                        timers.delete(id);
                    }
                });

                // Add or update chats
                spanishChats.forEach(newChat => {
                    const existingChat = currentChats.find(c => c.i === newChat.i);
                    if (!existingChat) {
                        // New chat: append card
                        const card = createChatCard(newChat);
                        chatList.appendChild(card);
                    } else {
                        // Check if chat details have changed
                        if (
                            existingChat.n !== newChat.n ||
                            existingChat.d !== newChat.d ||
                            existingChat.a !== newChat.a ||
                            existingChat.t !== newChat.t
                        ) {
                            // Update existing card, preserving timer
                            const card = chatList.querySelector(`[data-chat-id="${newChat.i}"]`);
                            if (card) {
                                const newCard = createChatCard(newChat);
                                chatList.replaceChild(newCard, card);
                            }
                        }
                    }
                });

                // Update currentChats
                currentChats = [...spanishChats];

                // Handle empty state
                if (spanishChats.length === 0) {
                    chatList.innerHTML = '<li>No Spanish chats found</li>';
                } else if (chatList.querySelector('.loading')) {
                    chatList.innerHTML = '';
                    spanishChats.forEach(chat => chatList.appendChild(createChatCard(chat)));
                }
            } catch (error) {
                // Clear timers on error
                timers.forEach((timer, chatId) => clearInterval(timer));
                timers.clear();
                chatList.innerHTML = `<li class="error">Error: ${error.message}</li>`;
            }
        }

        // Initial fetch and set interval for updates
        window.onload = () => {
            updateChats();
            setInterval(updateChats, 10000); // Update every 10 seconds
        };