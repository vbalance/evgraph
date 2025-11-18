import matplotlib.pyplot as plt
import pandas as pd
import matplotlib.dates as mdates
import numpy as np

# ============================================================================
# 1. ПОДГОТОВКА ДАННЫХ
# ============================================================================

# Чтение данных о коэффициентах из CSV файла
df = pd.read_csv('INPUT/odds_data.csv')
df['Time'] = pd.to_datetime(df['Time'], format='%H:%M:%S')

# Расчет Lifetime (время до следующего изменения любого из коэффициентов)
df['Lifetime'] = (df['Time'].shift(-1) - df['Time']).dt.total_seconds()

# Создаем копии для построения графиков
df['SoftOdds_Plot'] = df['SoftOdds'].copy()
df['FairOdds_Plot'] = df['FairOdds'].copy()

# Симуляция разрывов данных (опционально)
df.loc[4:5, 'SoftOdds_Plot'] = np.nan
df.loc[12:13, 'FairOdds_Plot'] = np.nan

# Расчет EV (Expected Value)
df['EV_Value'] = (1 / df['FairOdds']) * df['SoftOdds'] - 1

# ============================================================================
# 1.1. ДАННЫЕ О СТАВКАХ
# ============================================================================

# Чтение данных о ставках из CSV файла
df_bets = pd.read_csv('INPUT/bets_data.csv')
df_bets['Timestamp'] = pd.to_datetime(df_bets['Timestamp'], format='%H:%M:%S')

# ============================================================================
# 2. ПОСТРОЕНИЕ ГРАФИКА
# ============================================================================

plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=(14, 8))

# ============================================================================
# 3. ГРАДИЕНТНАЯ ЗАЛИВКА EV+ (КРИТИЧЕСКИЙ КОМПОНЕНТ)
# ============================================================================

# Заливаем каждый временной интервал отдельно
# Это гарантирует, что градиент строится индивидуально для каждого отрезка
for idx, row in df.iterrows():
    # Проверяем, что у нас есть валидные данные и положительный EV
    if pd.notna(row['SoftOdds_Plot']) and pd.notna(row['FairOdds_Plot']) and row['EV_Value'] > 0:

        # EV текущего интервала
        ev_value = row['EV_Value']
        ev_percent_max = int(np.ceil(ev_value * 100))

        # Временные границы интервала
        time_start = row['Time']
        # Для step='post' интервал идет до следующей точки
        if idx < len(df) - 1:
            time_end = df.iloc[idx + 1]['Time']
        else:
            # Для последней точки создаем небольшой интервал
            time_end = time_start + pd.Timedelta(seconds=1)

        # Строим градиент для этого интервала по слоям 1% EV
        for ev_percent in range(1, ev_percent_max + 1):
            ev_threshold = ev_percent / 100.0

            # Границы слоя для этого интервала
            layer_bottom = row['FairOdds_Plot'] * (1 + ev_threshold - 0.01)
            layer_top = row['FairOdds_Plot'] * (1 + ev_threshold)

            # КРИТИЧЕСКИ ВАЖНО: обрезаем верхнюю границу по Soft Odds
            layer_top = min(layer_top, row['SoftOdds_Plot'])

            # Расчет прозрачности (alpha)
            if ev_threshold <= 0.10:
                alpha = 0.1 + (ev_threshold * 7)
            else:
                alpha = 0.80

            # Рисуем слой для этого интервала
            ax.fill_between([time_start, time_end],
                          [layer_bottom, layer_bottom],
                          [layer_top, layer_top],
                          color='#00ff00', alpha=alpha,
                          step='post', zorder=2)

# ============================================================================
# 4. СЕТКА УРОВНЕЙ EV
# ============================================================================

# Рисуем сетку уровней для каждого интервала индивидуально
for idx, row in df.iterrows():
    if pd.notna(row['SoftOdds_Plot']) and pd.notna(row['FairOdds_Plot']) and row['EV_Value'] > 0:

        # Временные границы интервала
        time_start = row['Time']
        if idx < len(df) - 1:
            time_end = df.iloc[idx + 1]['Time']
        else:
            time_end = time_start + pd.Timedelta(seconds=1)

        # Рисуем линии уровней до максимума EV для этого интервала
        ev_value = row['EV_Value']
        max_grid_ev = min(ev_value, 0.25)  # До 25% максимум

        for ev_threshold in np.arange(0.01, max_grid_ev + 0.01, 0.01):
            grid_y = row['FairOdds_Plot'] * (1 + ev_threshold)

            # Рисуем только если линия ниже Soft Odds
            if grid_y <= row['SoftOdds_Plot']:
                ax.plot([time_start, time_end],
                       [grid_y, grid_y],
                       color='#00ff00', linewidth=0.3, alpha=0.3,
                       zorder=1)

# ============================================================================
# 5. ОСНОВНЫЕ ЛИНИИ И ТОЧКИ
# ============================================================================

# Fair Odds (красная линия)
ax.plot(df['Time'], df['FairOdds_Plot'],
        color='#ff3333', linewidth=2.5,
        drawstyle='steps-post', label='Fair Odds', zorder=3)

# Soft Odds (зеленая линия)
ax.plot(df['Time'], df['SoftOdds_Plot'],
        color='#00ff00', linewidth=2,
        drawstyle='steps-post', label='Soft Odds', zorder=4)

# Точки на Fair Odds (красные)
ax.scatter(df['Time'], df['FairOdds_Plot'],
          color='#ff3333', s=25, zorder=5)

# Точки на Soft Odds (зеленые)
ax.scatter(df['Time'], df['SoftOdds_Plot'],
          color='#00ff00', s=25, zorder=5)

# ============================================================================
# 5.1. ВИЗУАЛИЗАЦИЯ СТАВОК
# ============================================================================

for idx, bet in df_bets.iterrows():
    bet_start = bet['Timestamp']
    bet_end = bet_start + pd.Timedelta(seconds=bet['AcceptanceTime'])

    # Цвет бочки в зависимости от статуса
    if bet['Status'] == 'Accepted':
        barrel_color = '#00BFFF'  # Голубой (Deep Sky Blue)
        status_text = 'ACCEPTED'
    else:
        barrel_color = '#FFD700'  # Желтый (Gold)
        status_text = 'REJECTED'

    # Используем Soft Odds из данных ставки (уровень в момент попытки)
    barrel_y = bet['SoftOdds']

    # Рисуем "бочку" (толстая горизонтальная линия на уровне Soft Odds)
    ax.plot([bet_start, bet_end], [barrel_y, barrel_y],
            color=barrel_color, linewidth=15, solid_capstyle='round',
            alpha=0.8, zorder=6)

    # Добавляем вертикальные маркеры начала и конца
    ax.axvline(x=bet_start, color=barrel_color, linewidth=1.5,
               linestyle='--', alpha=0.5, zorder=5)
    ax.axvline(x=bet_end, color=barrel_color, linewidth=1.5,
               linestyle='--', alpha=0.5, zorder=5)

# ============================================================================
# 6. АННОТАЦИИ (информационные метки)
# ============================================================================

# Отображаем метки только для позиций с EV > 0
# Разносим их по разным уровням, чтобы избежать наложения
annotation_counter = 0
for idx, row in df.iterrows():
    if pd.notna(row['SoftOdds_Plot']) and pd.notna(row['FairOdds_Plot']) and row['EV_Value'] > 0:
        ev_percent = row['EV_Value'] * 100
        lifetime_str = f"{int(row['Lifetime'])}s" if pd.notna(row['Lifetime']) else "Last"

        # Формируем текст метки
        label_text = (f"S:{row['SoftOdds_Plot']:.2f}\n"
                      f"F:{row['FairOdds_Plot']:.2f}\n"
                      f"EV:+{ev_percent:.1f}%\n"
                      f"Life:{lifetime_str}")

        # Позиционирование
        x_pos = row['Time']
        y_pos = row['SoftOdds_Plot']

        # Чередуем вертикальное смещение для разных уровней
        # Создаем 3 уровня: 35, 80, 125 пикселей
        vertical_offsets = [35, 80, 125]
        y_offset = vertical_offsets[annotation_counter % 3]
        annotation_counter += 1

        # Рисуем аннотацию
        ax.annotate(label_text,
                    xy=(x_pos, y_pos),
                    xytext=(0, y_offset),
                    textcoords='offset points',
                    ha='center', va='bottom',
                    fontsize=7,
                    fontweight='bold',
                    color='#00ff00',
                    bbox=dict(boxstyle="round,pad=0.3",
                             fc="#1a1a1a",
                             ec="#00ff00",
                             lw=0.5,
                             alpha=0.9),
                    arrowprops=dict(arrowstyle='-',
                                   color='gray',
                                   lw=0.5),
                    zorder=10)

# ============================================================================
# 6.1. АННОТАЦИИ ДЛЯ СТАВОК
# ============================================================================

for idx, bet in df_bets.iterrows():
    bet_start = bet['Timestamp']
    bet_end = bet_start + pd.Timedelta(seconds=bet['AcceptanceTime'])

    # Цвет и статус
    if bet['Status'] == 'Accepted':
        barrel_color = '#00BFFF'
        status_text = 'ACCEPTED'
    else:
        barrel_color = '#FFD700'
        status_text = 'REJECTED'

    # Центр бочки для позиционирования аннотации
    bet_center = bet_start + pd.Timedelta(seconds=bet['AcceptanceTime'] / 2)

    # Текст аннотации
    bet_label = (f"{status_text}\n"
                 f"F:{bet['FairOdds']:.2f} S:{bet['SoftOdds']:.2f}\n"
                 f"EV:{bet['EV']:+.1f}%\n"
                 f"Accept:{bet['AcceptanceTime']:.1f}s")

    # Позиция Y для аннотации (над бочкой) - используем Soft Odds
    barrel_y = bet['SoftOdds']

    # Рисуем аннотацию над бочкой
    ax.annotate(bet_label,
                xy=(bet_center, barrel_y),
                xytext=(0, 20),
                textcoords='offset points',
                ha='center', va='bottom',
                fontsize=7,
                fontweight='bold',
                color=barrel_color,
                bbox=dict(boxstyle="round,pad=0.3",
                         fc="#1a1a1a",
                         ec=barrel_color,
                         lw=1.5,
                         alpha=0.95),
                arrowprops=dict(arrowstyle='-',
                               color=barrel_color,
                               lw=1),
                zorder=11)

# ============================================================================
# 7. ОФОРМЛЕНИЕ ГРАФИКА
# ============================================================================

ax.set_title('Odds History Analysis: Profit Gradient & Lifetime',
             color='white', fontsize=14, fontweight='bold', pad=15)
ax.set_ylabel('Odds', color='white')
ax.grid(True, color='gray', linestyle='--', linewidth=0.5, alpha=0.2)

# Настройка оси X с метками времени для всех точек
ax.set_xticks(df['Time'])
ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M:%S'))
plt.xticks(rotation=45, ha='right')

ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.legend(loc='upper left', frameon=False)

plt.tight_layout()
plt.show()
